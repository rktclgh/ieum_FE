"use client"

import { useRouter } from "next/navigation"

import { useProfileForm } from "@/features/join/hooks/use-profile-form"
import { useCompleteSocialSignup } from "@/features/social-login/hooks/use-social-mutations"
import { getApiCode } from "@/features/social-login/lib/api-error"
import { saveSocialLoginError } from "@/features/social-login/lib/oauth-state-storage"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"

function useSocialSignupFlow(socialSignupToken: string) {
  const router = useRouter()
  const profile = useProfileForm()
  const signupMutation = useCompleteSocialSignup()

  const handleSubmit = () => {
    if (!profile.values || !socialSignupToken || signupMutation.isPending) return

    signupMutation.mutate(
      {
        socialSignupToken,
        ...profile.values,
      },
      {
        onSuccess: () => {
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
    },
  }
}

export { useSocialSignupFlow }
