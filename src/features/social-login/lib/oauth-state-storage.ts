const KAKAO_OAUTH_STATE_KEY = "ieum.kakao_oauth_state"
const SOCIAL_LOGIN_ERROR_KEY = "ieum.social_login_error"

type SocialLoginErrorCode = "kakaoFailed" | "tokenExpired" | "socialAlreadyRegistered"

function getStorage() {
  if (typeof window === "undefined") return null
  return window.sessionStorage
}

function generateOAuthState() {
  return crypto.randomUUID()
}

function saveKakaoOAuthState(state: string) {
  getStorage()?.setItem(KAKAO_OAUTH_STATE_KEY, state)
}

function consumeKakaoOAuthState(returnedState: string | null) {
  const storage = getStorage()
  if (!storage || !returnedState) return false

  const savedState = storage.getItem(KAKAO_OAUTH_STATE_KEY)
  storage.removeItem(KAKAO_OAUTH_STATE_KEY)
  return savedState === returnedState
}

function saveSocialLoginError(code: SocialLoginErrorCode) {
  getStorage()?.setItem(SOCIAL_LOGIN_ERROR_KEY, code)
}

function consumeSocialLoginError() {
  const storage = getStorage()
  if (!storage) return null

  const code = storage.getItem(SOCIAL_LOGIN_ERROR_KEY) as SocialLoginErrorCode | null
  storage.removeItem(SOCIAL_LOGIN_ERROR_KEY)
  return code
}

export {
  consumeKakaoOAuthState,
  consumeSocialLoginError,
  generateOAuthState,
  saveKakaoOAuthState,
  saveSocialLoginError,
}
export type { SocialLoginErrorCode }
