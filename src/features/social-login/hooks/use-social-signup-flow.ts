"use client"

import { useRouter } from "next/navigation"

import { useProfileForm } from "@/features/join/hooks/use-profile-form"
import { updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import { useAvatarCropState } from "@/features/profile-image/hooks/use-avatar-crop-state"
import { useCompleteSocialSignup } from "@/features/social-login/hooks/use-social-mutations"
import { getApiCode } from "@/features/social-login/lib/api-error"
import { saveSocialLoginError } from "@/features/social-login/lib/oauth-state-storage"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"
import { uploadImage } from "@/lib/files/upload-image"

function useSocialSignupFlow(socialSignupToken: string) {
  const router = useRouter()
  const profile = useProfileForm()
  const signupMutation = useCompleteSocialSignup()
  const avatarCrop = useAvatarCropState()

  const handleSubmit = () => {
    if (!profile.values || !socialSignupToken || signupMutation.isPending) return

    signupMutation.mutate(
      {
        socialSignupToken,
        ...profile.values,
      },
      {
        onSuccess: async () => {
          // 소셜 가입 완료 시점에 세션이 이미 수립되므로 별도 로그인 없이 바로 업로드한다.
          if (avatarCrop.croppedBlob) {
            try {
              const fileId = await uploadImage(avatarCrop.croppedBlob, "profile")
              await updateProfileImage(fileId)
            } catch {
              // 사진 업로드 실패는 가입 완료를 막지 않는다(마이에서 재시도 가능)
            }
          }
          socialSignupStorage.clear()
          router.push("/")
        },
        onError: (error) => {
          const code = getApiCode(error)
          if (code === "INVALID_SOCIAL_SIGNUP_TOKEN" || code === "SOCIAL_ALREADY_REGISTERED") {
            socialSignupStorage.clear()
            saveSocialLoginError(
              code === "SOCIAL_ALREADY_REGISTERED" ? "socialAlreadyRegistered" : "tokenExpired"
            )
            router.push("/login")
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
      signupMutation,
      ...avatarCrop,
    },
  }
}

export { useSocialSignupFlow }
