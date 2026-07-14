"use client"

import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { useStartSocial } from "@/features/social-login/hooks/use-social-mutations"
import { getApiCode } from "@/features/social-login/lib/api-error"
import {
  consumeKakaoOAuthState,
  saveSocialLoginError,
} from "@/features/social-login/lib/oauth-state-storage"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"
import { useTranslation } from "@/lib/i18n/use-translation"

function KakaoCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { messages } = useTranslation()
  const startSocialMutation = useStartSocial()
  const hasStartedRef = React.useRef(false)

  React.useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const error = searchParams.get("error")
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (error || !code || !consumeKakaoOAuthState(state)) {
      saveSocialLoginError("kakaoFailed")
      router.replace("/login")
      return
    }

    const redirectUri = `${window.location.origin}/oauth/kakao/callback`
    startSocialMutation.mutate(
      { provider: "kakao", code, redirectUri },
      {
        onSuccess: (response) => {
          if (!response.isNewUser) {
            router.replace("/")
            return
          }

          socialSignupStorage.save({
            provider: "kakao",
            token: response.socialSignupToken,
            expiresInSeconds: response.expiresInSeconds,
          })
          router.replace("/join/social")
        },
        onError: (error) => {
          const code = getApiCode(error)
          if (code === "SUSPENDED_USER") saveSocialLoginError("suspended")
          else if (code === "INVALID_SOCIAL_TOKEN") saveSocialLoginError("invalidToken")
          else saveSocialLoginError("kakaoFailed")
          router.replace("/login")
        },
      }
    )
  }, [router, searchParams, startSocialMutation])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary-400" />
        <p className="text-body-medium-16 text-gray-900">{messages.social.loading}</p>
      </div>
    </main>
  )
}

export default function KakaoCallbackPage() {
  return (
    <React.Suspense fallback={null}>
      <KakaoCallbackContent />
    </React.Suspense>
  )
}
