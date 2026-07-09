import axios from "axios"

import { apiClient } from "@/lib/api/client"

interface UserMeResponse {
  userId: number
  email: string
  nickname: string
  birthDate: string
  gender: "male" | "female" | "other"
  nationality: string
  profileImageUrl: string | null
  grade: string
  acceptedCount: number
  settings: Record<string, unknown>
}

async function getMe() {
  try {
    const { data } = await apiClient.get<UserMeResponse>("/api/v1/users/me")
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      return null
    }
    throw error
  }
}

async function logout() {
  await apiClient.post("/api/v1/auth/logout")
}

export { getMe, logout }
export type { UserMeResponse }
