import { apiClient } from "@/lib/api/client"
import type { UserMeResponse, UserSettings } from "@/features/session/api/session-api"
import type {
  InquiryRequest,
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

// 회원탈퇴 — 204. 백엔드가 세션 쿠키를 만료시키므로 이후 세션 캐시를 비우고 /login으로 보낸다.
async function withdrawMe() {
  await apiClient.delete("/api/v1/users/me")
}

// 문의 등록 — POST /api/v1/inquiries { content }. title은 옵션(디자인엔 내용만).
async function submitInquiry(payload: InquiryRequest) {
  await apiClient.post("/api/v1/inquiries", payload)
}

export { updateMe, updateSettings, updateLocation, withdrawMe, submitInquiry }
