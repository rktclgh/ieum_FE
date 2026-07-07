import { apiClient } from "@/lib/api/client"

interface RefreshSessionResponse {
  userId: number
  role: string
}

async function refreshSession() {
  const { data } = await apiClient.post<RefreshSessionResponse>("/api/v1/auth/refresh")
  return data
}

async function logout() {
  await apiClient.post("/api/v1/auth/logout")
}

export { refreshSession, logout }
export type { RefreshSessionResponse }
