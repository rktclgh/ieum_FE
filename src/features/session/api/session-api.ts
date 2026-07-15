import axios from "axios"

import { apiClient } from "@/lib/api/client"
import type { UserRole } from "@/features/session/types/user-role"
import type { LanguageCode } from "@/lib/i18n/languages"

type Gender = "male" | "female" | "other"
type NotifyRadiusKm = 3 | 5 | 10

interface UserSettings {
  language: LanguageCode
  cameraPermission: boolean
  pushPermission: boolean
  notifyAll: boolean
  notifyMeeting: boolean
  notifyQuestion: boolean
  notifyRadiusKm: NotifyRadiusKm
}

interface UserMeResponse {
  userId: number
  email: string
  nickname: string
  birthDate: string | null
  gender: Gender | null
  nationality: string | null
  profileImageUrl: string | null
  grade: string
  role: UserRole
  acceptedCount: number
  settings: UserSettings
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
export type { UserMeResponse, UserSettings, Gender, NotifyRadiusKm }
