import axios from "axios"

import { notifySessionExpired } from "@/features/session/lib/session-events"
import {
  claimRefreshRetry,
  classifyRefreshFailure,
} from "@/features/session/lib/session-retry"
import { DEV_BACKEND_ORIGIN } from "@/lib/runtime/dev-backend-origin"

export const apiClient = axios.create({
  baseURL: DEV_BACKEND_ORIGIN,
  withCredentials: true,
})

export function getCsrfTokenCookie() {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

apiClient.interceptors.request.use((config) => {
  if (config.method?.toLowerCase() !== "get") {
    const csrfToken = getCsrfTokenCookie()
    if (csrfToken) config.headers.set("X-CSRF-Token", csrfToken)
  }
  return config
})

let refreshPromise: Promise<unknown> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthBootstrapCall =
      config?.url?.includes("/auth/refresh") ||
      config?.url?.includes("/auth/login") ||
      config?.url?.includes("/auth/social")

    if (
      response?.status !== 401 ||
      !config ||
      isAuthBootstrapCall ||
      !claimRefreshRetry(config)
    ) {
      return Promise.reject(error)
    }

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post("/api/v1/auth/refresh")
          .catch((refreshError: unknown) => {
            const status = axios.isAxiosError(refreshError)
              ? refreshError.response?.status
              : undefined

            if (classifyRefreshFailure(status) === "expired") {
              notifySessionExpired()
            }

            throw refreshError
          })
          .finally(() => {
            refreshPromise = null
          })
      }
      await refreshPromise
      return apiClient(config)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)
