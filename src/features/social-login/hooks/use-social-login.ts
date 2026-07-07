"use client"

import axios from "axios"
import { useRouter } from "next/navigation"
import * as React from "react"

import type { SocialProvider, SocialStartResponse } from "@/features/social-login/api/social-api"
import { useStartSocial } from "@/features/social-login/hooks/use-social-mutations"
import { requestGoogleIdToken } from "@/features/social-login/lib/google-identity"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"
import { useTranslation } from "@/lib/i18n/use-translation"

function getApiCode(error: unknown) {
  if (!axios.isAxiosError<{ code?: string }>(error)) return undefined
  return error.response?.data?.code
}

function useSocialLogin() {
  const router = useRouter()
  const { messages } = useTranslation()
  const startSocialMutation = useStartSocial()
  const [errorMessage, setErrorMessage] = React.useState("")

  const handleStartResponse = React.useCallback(
    (provider: SocialProvider, response: SocialStartResponse) => {
      if (!response.isNewUser) {
        router.push("/")
        return
      }

      socialSignupStorage.save({
        provider,
        token: response.socialSignupToken,
        email: response.email,
        expiresInSeconds: response.expiresInSeconds,
      })
      router.push("/join/social")
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
    setErrorMessage("")

    try {
      const { idToken, nonce } = await requestGoogleIdToken()
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
      setErrorMessage(messages.social.googleFailed)
    }
  }, [getSocialErrorMessage, handleStartResponse, messages.social.googleFailed, startSocialMutation])

  const startKakao = React.useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    if (!clientId) {
      setErrorMessage(messages.social.kakaoFailed)
      return
    }

    const redirectUri = `${window.location.origin}/oauth/kakao/callback`
    const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize")
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("response_type", "code")
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
