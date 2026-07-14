"use client"

import axios from "axios"
import { useSyncExternalStore } from "react"

import { useMe } from "@/features/session/hooks/use-me"
import { resolveAuthState } from "@/features/session/lib/auth-state"
import { refreshStore } from "@/features/session/lib/session-events"

function getBackendUnavailableError(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined
  if (!error.response || error.response.status >= 500) return error
  return undefined
}

function useAuthState() {
  const { data, error, isFetching, isPending, refetch } = useMe()
  const refreshState = useSyncExternalStore(
    refreshStore.subscribe,
    refreshStore.getSnapshot,
    refreshStore.getServerSnapshot,
  )
  const backendUnavailableError = getBackendUnavailableError(error)

  if (
    error !== null &&
    error !== undefined &&
    backendUnavailableError === undefined
  ) {
    throw error
  }

  return {
    state: resolveAuthState({
      data,
      isFetching,
      isPending,
      isRefreshing: refreshState === "refreshing",
      backendUnavailableError,
    }),
    refetch,
  }
}

export { useAuthState }
