import axios, { type AxiosInstance } from "axios"

import {
  claimRefreshRetry,
  classifyRefreshFailure,
} from "../../features/session/lib/session-retry"
import { notifySessionExpired } from "../../features/session/lib/session-events"

function installSessionInterceptor(client: AxiosInstance) {
  let refreshPromise: Promise<unknown> | null = null

  return client.interceptors.response.use(
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
          refreshPromise = client
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
        return client(config)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    },
  )
}

export { installSessionInterceptor }
