"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import type { SocialProvider, SocialStartResponse } from "@/features/social-login/api/social-api"
import { useStartSocial } from "@/features/social-login/hooks/use-social-mutations"
import { getApiCode } from "@/features/social-login/lib/api-error"
import { requestGoogleIdToken } from "@/features/social-login/lib/google-identity"
import {
  consumeSocialLoginError,
  generateOAuthState,
  saveKakaoOAuthState,
} from "@/features/social-login/lib/oauth-state-storage"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function useSocialLogin() {
  const router = useRouter()
  const { messages } = useTranslation()
  const startSocialMutation = useStartSocial()
  const googleStartRequestIdRef = React.useRef(0)
  const [errorMessage, setErrorMessage] = React.useState("")

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const code = consumeSocialLoginError()
      if (code === "kakaoFailed") setErrorMessage(messages.social.kakaoFailed)
      if (code === "tokenExpired") setErrorMessage(messages.social.tokenExpired)
      if (code === "invalidToken") setErrorMessage(messages.social.invalidToken)
      if (code === "suspended") setErrorMessage(messages.social.suspended)
      if (code === "socialAlreadyRegistered") {
        setErrorMessage(messages.social.socialAlreadyRegistered)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    messages.social.invalidToken,
    messages.social.kakaoFailed,
    messages.social.socialAlreadyRegistered,
    messages.social.suspended,
    messages.social.tokenExpired,
  ])

  const handleStartResponse = React.useCallback(
    (provider: SocialProvider, response: SocialStartResponse) => {
      if (!response.isNewUser) {
        router.push(routes.home())
        return
      }

      socialSignupStorage.save({
        provider,
        token: response.socialSignupToken,
        expiresInSeconds: response.expiresInSeconds,
      })
      router.push(routes.socialJoin())
    },
    [router]
  )

  const getSocialErrorMessage = React.useCallback(
    (error: unknown, fallback: string) => {
      const code = getApiCode(error)
      if (code === "INVALID_SOCIAL_TOKEN") return messages.social.invalidToken
      if (code === "SUSPENDED_USER") return messages.social.suspended
      return fallback
    },
    [messages.social.invalidToken, messages.social.suspended]
  )

  const startGoogle = React.useCallback(async () => {
    if (startSocialMutation.isPending) return
    const requestId = googleStartRequestIdRef.current + 1
    googleStartRequestIdRef.current = requestId
    setErrorMessage("")

    try {
      const { idToken, nonce } = await requestGoogleIdToken()
      if (googleStartRequestIdRef.current !== requestId || startSocialMutation.isPending) return
      startSocialMutation.mutate(
        { provider: "google", idToken, nonce },
        {
          onSuccess: (response) => handleStartResponse("google", response),
          onError: (error) => {
            setErrorMessage(getSocialErrorMessage(error, messages.social.googleFailed))
          },
        }
      )
    } catch {
      if (googleStartRequestIdRef.current === requestId) {
        setErrorMessage(messages.social.googleFailed)
      }
    }
  }, [getSocialErrorMessage, handleStartResponse, messages.social.googleFailed, startSocialMutation])

  const startKakao = React.useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    if (!clientId) {
      setErrorMessage(messages.social.kakaoFailed)
      return
    }

    const redirectUri = `${window.location.origin}${routes.kakaoCallback()}`
    const state = generateOAuthState()
    saveKakaoOAuthState(state)
    const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize")
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("response_type", "code")
    // 백엔드가 OIDC id_token으로 검증하므로 openid scope 필수 (없으면 카카오가 id_token 미발급)
    authorizeUrl.searchParams.set("scope", "openid")
    authorizeUrl.searchParams.set("state", state)
    window.location.assign(authorizeUrl.toString())
  }, [messages.social.kakaoFailed])

  return {
    startGoogle,
    startKakao,
    isPending: startSocialMutation.isPending,
    errorMessage,
    handleStartResponse,
    setErrorMessage,
  }
}

export { useSocialLogin }
