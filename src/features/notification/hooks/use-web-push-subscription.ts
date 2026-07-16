"use client"

import * as React from "react"

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
  type WebPushStatus,
} from "@/features/notification/lib/web-push"

type WebPushConnectionError =
  | "unsupported"
  | "server-disabled"
  | "permission-denied"
  | "connection-failed"

interface WebPushConnectionState {
  status: WebPushStatus
  error: WebPushConnectionError | null
  isLoading: boolean
  isConnecting: boolean
}

function browserPermission() {
  return Notification.permission
}

async function inspectWebPushDevice({
  registerServiceWorker,
}: {
  registerServiceWorker: boolean
}) {
  if (!isWebPushSupported()) {
    return {
      config: null,
      status: "unsupported" as const,
    }
  }

  const config = await getWebPushConfig()
  const permission = browserPermission()
  let browserSubscribed = false

  if (config.enabled && permission !== "denied") {
    const registration = registerServiceWorker
      ? await registerWebPushServiceWorker()
      : await navigator.serviceWorker.getRegistration("/")
    browserSubscribed = Boolean(await getExistingWebPushSubscription(registration))
  }

  return {
    config,
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

    const inspect = async () => {
      try {
        const result = await inspectWebPushDevice({ registerServiceWorker: true })
        if (cancelled || latestRequest.current !== request) return

        setState((current) => ({
          ...current,
          status: result.status,
          error: null,
          isLoading: false,
        }))
      } catch (error) {
        if (cancelled || latestRequest.current !== request) return

        setState((current) => ({
          ...current,
          error: "connection-failed",
          isLoading: false,
        }))
        console.warn("Failed to inspect Web Push subscription", error)
      }
    }

    void inspect()
    return () => {
      cancelled = true
    }
  }, [])

  const connectCurrentDevice = React.useCallback(async () => {
    const request = ++latestRequest.current
    setState((current) => ({ ...current, error: null, isConnecting: true }))

    try {
      if (!isWebPushSupported()) {
        setState((current) => ({
          ...current,
          status: "unsupported",
          error: "unsupported",
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
      if (permission !== "granted") {
        if (latestRequest.current === request) {
          setState((current) => ({
            ...current,
            status: "permission-denied",
            error: "permission-denied",
            isConnecting: false,
            isLoading: false,
          }))
        }
        return false
      }

      const config = await getWebPushConfig()
      if (!config.enabled || !config.vapidPublicKey) {
        if (latestRequest.current === request) {
          setState((current) => ({
            ...current,
            status: "server-disabled",
            error: "server-disabled",
            isConnecting: false,
            isLoading: false,
          }))
        }
        return false
      }

      const registration = await registerWebPushServiceWorker()
      const subscription = await createOrReuseWebPushSubscription(
        registration,
        config.vapidPublicKey,
      )
      await upsertWebPushSubscription(subscription.toJSON())

      if (latestRequest.current === request) {
        setState({
          status: "subscribed",
          error: null,
          isLoading: false,
          isConnecting: false,
        })
      }
      return true
    } catch (error) {
      if (latestRequest.current === request) {
        setState((current) => ({
          ...current,
          error: "connection-failed",
          isConnecting: false,
          isLoading: false,
        }))
      }
      console.warn("Failed to connect Web Push subscription", error)
      return false
    }
  }, [])

  return { ...state, connectCurrentDevice }
}

function useReconcileWebPushSubscription({
  userId,
  notifyAll,
}: {
  userId: number | undefined
  notifyAll: boolean | undefined
}) {
  React.useEffect(() => {
    if (!userId || !notifyAll || !isWebPushSupported()) return

    let cancelled = false

    const reconcile = async () => {
      if (browserPermission() !== "granted") return

      try {
        const config = await getWebPushConfig()
        if (cancelled || !config.enabled || config.subscribed) return

        const registration = await navigator.serviceWorker.getRegistration("/")
        if (cancelled || !registration) return

        const subscription = await getExistingWebPushSubscription(registration)
        if (cancelled || !subscription) return

        await upsertWebPushSubscription(subscription.toJSON())
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to reconcile Web Push subscription", error)
        }
      }
    }

    void reconcile()
    return () => {
      cancelled = true
    }
  }, [notifyAll, userId])
}

export {
  useReconcileWebPushSubscription,
  useWebPushSubscription,
}
export type { WebPushConfig, WebPushConnectionError }
