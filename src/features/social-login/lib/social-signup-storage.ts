import type { SocialProvider } from "@/features/social-login/api/social-api"

const SOCIAL_SIGNUP_STORAGE_KEY = "ieum.social_signup"

interface SocialSignupStoragePayload {
  token: string
  provider: SocialProvider
  email?: string
  expiresAt: number
}

interface SaveSocialSignupPayload {
  token: string
  provider: SocialProvider
  email?: string
  expiresInSeconds: number
}

function getStorage() {
  if (typeof window === "undefined") return null
  return window.sessionStorage
}

function save({ expiresInSeconds, ...payload }: SaveSocialSignupPayload) {
  const storage = getStorage()
  if (!storage) return

  storage.setItem(
    SOCIAL_SIGNUP_STORAGE_KEY,
    JSON.stringify({
      ...payload,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    })
  )
}

function load(): SocialSignupStoragePayload | null {
  const storage = getStorage()
  if (!storage) return null

  const rawPayload = storage.getItem(SOCIAL_SIGNUP_STORAGE_KEY)
  if (!rawPayload) return null

  try {
    const payload = JSON.parse(rawPayload) as SocialSignupStoragePayload
    if (!payload.token || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
      clear()
      return null
    }
    return payload
  } catch {
    clear()
    return null
  }
}

function clear() {
  getStorage()?.removeItem(SOCIAL_SIGNUP_STORAGE_KEY)
}

export { clear, load, save }
export type { SocialSignupStoragePayload }
