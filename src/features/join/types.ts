import type { CountryCode } from "@/lib/constants/countries"
import type { LanguageCode } from "@/lib/i18n/languages"

export type JoinStep = "credentials" | "profile"
export type NicknameStatus = "idle" | "available" | "duplicate"
export type Gender = "female" | "male"

export interface ProfileValues {
  nickname: string
  birthDate: string
  gender: Gender
  nationality: string
  language: LanguageCode
}

interface ProfileMutationState {
  isPending: boolean
  isError: boolean
  error: unknown
}

export interface ProfileFormApi {
  nickname: string
  onNicknameChange: (value: string) => void
  nicknameStatus: NicknameStatus
  onDuplicateCheck: () => void
  checkNicknameMutation: ProfileMutationState
  birthDateDigits: string
  onBirthDateChange: (value: string) => void
  isBirthDateInvalid: boolean
  gender: Gender | null
  setGender: (gender: Gender) => void
  nationality: CountryCode | ""
  onNationalityChange: (value: string) => void
  isNextEnabled: boolean
  onSubmit: () => void
  signupMutation: ProfileMutationState
  avatarPreview: string | null
  onAvatarFileSelected: (file: File) => void
  editorSrc: string | null
  onEditorClose: () => void
  onCropped: (blob: Blob) => void
}
