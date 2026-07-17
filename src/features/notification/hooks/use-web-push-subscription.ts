"use client"

import * as React from "react"
import { type QueryClient, useQueryClient } from "@tanstack/react-query"

import {
  getWebPushConfig,
  upsertWebPushSubscription,
  type WebPushConfig,
} from "@/features/notification/api/web-push-api"
import {
  createOrReuseWebPushSubscription,
  getExistingWebPushSubscription,
  isWebPushSupported,
  registerWebPushServiceWorker,
  resolveWebPushStatus,
  shouldStartWebPushReconcile,
  shouldUpsertReconciledSubscription,
  type WebPushStatus,
} from "@/features/notification/lib/web-push"
import {
  getSessionAbortSignal,
  getSessionGeneration,
  isSessionGenerationCurrent,
} from "@/features/session/lib/session-cache"

type WebPushConnectionError = "connection-failed"

interface WebPushConnectionState {
  status: WebPushStatus
  error: WebPushConnectionError | null
  isLoading: boolean
  isConnecting: boolean
}

function browserPermission() {
  return Notification.permission
}

function isSessionWorkCurrent(
  queryClient: QueryClient,
  generation: number,
  sessionSignal: AbortSignal,
) {
  return (
    !sessionSignal.aborted &&
    isSessionGenerationCurrent(queryClient, generation)
  )
}

async function inspectWebPushDevice(config: WebPushConfig | null) {
  if (!isWebPushSupported()) {
    return {
      status: "unsupported" as const,
    }
  }

  if (!config) throw new Error("Web Push configuration is required")

  const permission = browserPermission()
  let browserSubscribed = false

  if (config.enabled && permission !== "denied") {
    const registration = await registerWebPushServiceWorker()
    browserSubscribed = Boolean(await getExistingWebPushSubscription(registration))
  }

  return {
    status: resolveWebPushStatus({
      supported: true,
      serverEnabled: config.enabled,
      permission,
      backendSubscribed: config.subscribed,
      browserSubscribed,
    }),
  }
}

function useWebPushSubscription() {
  const queryClient = useQueryClient()
  const [state, setState] = React.useState<WebPushConnectionState>(() => ({
    status: isWebPushSupported() ? "unsubscribed" : "unsupported",
    error: null,
    isLoading: true,
    isConnecting: false,
  }))
  const latestRequest = React.useRef(0)

  React.useEffect(() => {
    let cancelled = false
    const request = ++latestRequest.current
    const generation = getSessionGeneration(queryClient)
    const sessionSignal = getSessionAbortSignal(queryClient)

    const inspect = async () => {
      try {
        const config = isWebPushSupported()
          ? await getWebPushConfig({ signal: sessionSignal })
          : null
        if (
          cancelled ||
          latestRequest.current !== request ||
          !isSessionWorkCurrent(queryClient, generation, sessionSignal)
        ) {
          return
        }

        const result = await inspectWebPushDevice(config)
        if (
          cancelled ||
          latestRequest.current !== request ||
          !isSessionWorkCurrent(queryClient, generation, sessionSignal)
        ) {
          return
        }

        setState((current) => ({
          ...current,
          status: result.status,
          error: null,
          isLoading: false,
        }))
      } catch {
        if (
          cancelled ||
          latestRequest.current !== request ||
          !isSessionWorkCurrent(queryClient, generation, sessionSignal)
        ) {
          return
        }

        setState((current) => ({
          ...current,
          error: "connection-failed",
          isLoading: false,
        }))
        console.warn("Failed to inspect Web Push subscription")
      }
    }

    void inspect()
    return () => {
      cancelled = true
    }
  }, [queryClient])

  const connectCurrentDevice = React.useCallback(async () => {
    const request = ++latestRequest.current
    const generation = getSessionGeneration(queryClient)
    const sessionSignal = getSessionAbortSignal(queryClient)
    setState((current) => ({ ...current, error: null, isConnecting: true }))

    try {
      if (!isWebPushSupported()) {
        setState((current) => ({
          ...current,
          status: "unsupported",
          error: null,
          isConnecting: false,
          isLoading: false,
        }))
        return false
      }

      // Permission must be requested directly from this user-triggered flow.
      let permission = browserPermission()
      if (permission === "default") {
        permission = await Notification.requestPermission()
      }
      if (!isSessionWorkCurrent(queryClient, generation, sessionSignal)) return false
      if (permission !== "granted") {
        if (latestRequest.current === request) {
          setState((current) => ({
            ...current,
            status: "permission-denied",
            error: null,
            isConnecting: false,
            isLoading: false,
          }))
        }
        return false
      }

      const config = await getWebPushConfig({ signal: sessionSignal })
      if (!isSessionWorkCurrent(queryClient, generation, sessionSignal)) return false
      if (!config.enabled || !config.vapidPublicKey) {
        if (latestRequest.current === request) {
          setState((current) => ({
            ...current,
            status: "server-disabled",
            error: null,
            isConnecting: false,
            isLoading: false,
          }))
        }
        return false
      }

      const registration = await registerWebPushServiceWorker()
      if (!isSessionWorkCurrent(queryClient, generation, sessionSignal)) return false
      const subscription = await createOrReuseWebPushSubscription(
        registration,
        config.vapidPublicKey,
      )
      if (!isSessionWorkCurrent(queryClient, generation, sessionSignal)) return false
      await upsertWebPushSubscription(subscription.toJSON(), { signal: sessionSignal })
      if (!isSessionWorkCurrent(queryClient, generation, sessionSignal)) return false

      if (latestRequest.current === request) {
        setState({
          status: "subscribed",
          error: null,
          isLoading: false,
          isConnecting: false,
        })
      }
      return true
    } catch {
      if (
        latestRequest.current === request &&
        isSessionWorkCurrent(queryClient, generation, sessionSignal)
      ) {
        setState((current) => ({
          ...current,
          error: "connection-failed",
          isConnecting: false,
          isLoading: false,
        }))
        console.warn("Failed to connect Web Push subscription")
      }
      return false
    }
  }, [queryClient])

  return { ...state, connectCurrentDevice }
}

function useReconcileWebPushSubscription({
  userId,
  notifyAll,
}: {
  userId: number | undefined
  notifyAll: boolean | undefined
}) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    const supported = isWebPushSupported()
    if (
      !shouldStartWebPushReconcile({
        userId,
        notifyAll,
        supported,
        permission: supported ? browserPermission() : "default",
      })
    ) {
      return
    }

    let cancelled = false
    const generation = getSessionGeneration(queryClient)
    const sessionSignal = getSessionAbortSignal(queryClient)
    const isCurrent = () =>
      !cancelled && isSessionWorkCurrent(queryClient, generation, sessionSignal)

    const reconcile = async () => {
      try {
        const config = await getWebPushConfig({ signal: sessionSignal })
        if (!isCurrent()) return

        const registration = await navigator.serviceWorker.getRegistration("/")
        if (!isCurrent() || !registration) return

        const subscription = await getExistingWebPushSubscription(registration)
        if (!isCurrent()) return

        if (
          !subscription ||
          !shouldUpsertReconciledSubscription({
            serverEnabled: config.enabled,
            hasBrowserSubscription: Boolean(subscription),
            backendSubscribed: config.subscribed,
          })
        ) {
          return
        }

        await upsertWebPushSubscription(subscription.toJSON(), { signal: sessionSignal })
      } catch {
        if (isCurrent()) {
          console.warn("Failed to reconcile Web Push subscription")
        }
      }
    }

    void reconcile()
    return () => {
      cancelled = true
    }
  }, [notifyAll, queryClient, userId])
}

export {
  useReconcileWebPushSubscription,
  useWebPushSubscription,
}
export type { WebPushConnectionError }
