import { apiClient } from "@/lib/api/client"

type SocialProvider = "google" | "kakao"

type SocialStartRequest =
  | {
      provider: "google"
      idToken: string
      nonce?: string
    }
  | {
      provider: "kakao"
      code: string
      redirectUri: string
    }

type SocialStartResponse =
  | {
      isNewUser: false
      userId: number
      role: string
    }
  | {
      isNewUser: true
      socialSignupToken: string
      expiresInSeconds: number
    }

interface SocialSignupRequest {
  socialSignupToken: string
  nickname: string
  birthDate: string
  gender: "female" | "male"
  nationality: string
  language: string
}

interface SocialSignupResponse {
  userId: number
  role: string
}

async function startSocial(request: SocialStartRequest) {
  const { data } = await apiClient.post<SocialStartResponse>("/api/v1/auth/social", request)
  return data
}

async function completeSocialSignup(request: SocialSignupRequest) {
  const { data } = await apiClient.post<SocialSignupResponse>(
    "/api/v1/auth/social/signup",
    request
  )
  return data
}

export { completeSocialSignup, startSocial }
export type {
  SocialProvider,
  SocialSignupRequest,
  SocialSignupResponse,
  SocialStartRequest,
  SocialStartResponse,
}
