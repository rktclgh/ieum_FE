import axios from "axios"

import { installSessionInterceptor } from "@/lib/api/session-interceptor"
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

installSessionInterceptor(apiClient)
