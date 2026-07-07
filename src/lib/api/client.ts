import axios from "axios"

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
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

    if (response?.status !== 401 || config._retried || isAuthBootstrapCall) {
      return Promise.reject(error)
    }
    config._retried = true

    try {
      refreshPromise ??= apiClient
        .post("/api/v1/auth/refresh")
        .finally(() => {
          refreshPromise = null
        })
      await refreshPromise
      return apiClient(config)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)
