import { apiClient } from "@/lib/api/client"
import type { UserMeResponse, UserSettings } from "@/features/session/api/session-api"
import type {
  UpdateLocationRequest,
  UpdateMeRequest,
  UpdateSettingsRequest,
} from "@/features/my/api/my-types"

// 상태 변경(PATCH/PUT) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function updateMe(payload: UpdateMeRequest) {
  const { data } = await apiClient.patch<UserMeResponse>("/api/v1/users/me", payload)
  return data
}

async function updateSettings(payload: UpdateSettingsRequest) {
  const { data } = await apiClient.patch<UserSettings>("/api/v1/users/me/settings", payload)
  return data
}

// 204 No Content
async function updateLocation(payload: UpdateLocationRequest) {
  await apiClient.put("/api/v1/users/me/location", payload)
}

export { updateMe, updateSettings, updateLocation }
