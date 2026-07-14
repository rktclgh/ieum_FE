import type { Gender, NotifyRadiusKm, UserSettings } from "@/features/session/api/session-api"
import type { LanguageCode } from "@/lib/i18n/languages"

// PATCH /users/me — 모든 필드 부분수정(생략 = 변경 없음).
// nationality는 백엔드가 ISO 3166-1 alpha-2("KR")를 기대한다.
interface UpdateMeRequest {
  nickname?: string
  birthDate?: string
  gender?: Gender
  nationality?: string
}

// PATCH /users/me/settings — 응답(UserSettings)과 동일한 키의 부분수정.
type UpdateSettingsRequest = Partial<UserSettings>

// PUT /users/me/location — 둘 다 필수.
interface UpdateLocationRequest {
  longitude: number
  latitude: number
}

export type { UpdateMeRequest, UpdateSettingsRequest, UpdateLocationRequest, LanguageCode, NotifyRadiusKm }
