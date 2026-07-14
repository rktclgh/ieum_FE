"use client"

import axios from "axios"

import { useMe } from "@/features/session/hooks/use-me"
import { resolveAuthState } from "@/features/session/lib/auth-state"

function getBackendUnavailableError(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined
  if (!error.response || error.response.status >= 500) return error
  return undefined
}

function useAuthState() {
  const { data, error, isPending, refetch } = useMe()
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
      isPending,
      backendUnavailableError,
    }),
    refetch,
  }
}

export { useAuthState }
