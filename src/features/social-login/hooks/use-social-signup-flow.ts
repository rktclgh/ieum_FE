"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useProfileForm } from "@/features/join/hooks/use-profile-form"
import { updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import { useAvatarCropState } from "@/features/profile-image/hooks/use-avatar-crop-state"
import { useCompleteSocialSignup } from "@/features/social-login/hooks/use-social-mutations"
import { getApiCode } from "@/features/social-login/lib/api-error"
import { saveSocialLoginError } from "@/features/social-login/lib/oauth-state-storage"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"
import { uploadImage } from "@/lib/files/upload-image"
import { routes } from "@/lib/navigation/routes"

function useSocialSignupFlow(socialSignupToken: string) {
  const router = useRouter()
  const profile = useProfileForm()
  const signupMutation = useCompleteSocialSignup()
  const avatarCrop = useAvatarCropState()
  // signupMutation.isPending 는 가입 응답 즉시 false 가 되므로, 이어지는 이미지 업로드까지
  // 로딩 상태를 유지해 제출 버튼 재활성화(중복 가입 요청)를 막는다.
  const [isFinalizing, setIsFinalizing] = React.useState(false)

  const handleSubmit = () => {
    if (!profile.values || !socialSignupToken || signupMutation.isPending || isFinalizing) return

    signupMutation.mutate(
      {
        socialSignupToken,
        ...profile.values,
      },
      {
        onSuccess: async () => {
          // 소셜 가입 완료 시점에 세션이 이미 수립되므로 별도 로그인 없이 바로 업로드한다.
          // 업로드가 끝날 때까지 로딩 상태를 유지한다(중복 제출 방지).
          setIsFinalizing(true)
          try {
            if (avatarCrop.croppedBlob) {
              try {
                const fileId = await uploadImage(avatarCrop.croppedBlob, "profile")
                await updateProfileImage(fileId)
              } catch {
                // 사진 업로드 실패는 가입 완료를 막지 않는다(마이에서 재시도 가능)
              }
            }
            socialSignupStorage.clear()
            router.push(routes.home())
          } finally {
            setIsFinalizing(false)
          }
        },
        onError: (error) => {
          const code = getApiCode(error)
          if (code === "INVALID_SOCIAL_SIGNUP_TOKEN" || code === "SOCIAL_ALREADY_REGISTERED") {
            socialSignupStorage.clear()
            saveSocialLoginError(
              code === "SOCIAL_ALREADY_REGISTERED" ? "socialAlreadyRegistered" : "tokenExpired"
            )
            router.push(routes.login())
          }
        },
      }
    )
  }

  return {
    profile: {
      ...profile,
      isNextEnabled: profile.isValid,
      onSubmit: handleSubmit,
      signupMutation: {
        isPending: signupMutation.isPending || isFinalizing,
        isError: signupMutation.isError,
        error: signupMutation.error,
      },
      ...avatarCrop,
    },
  }
}

export { useSocialSignupFlow }
