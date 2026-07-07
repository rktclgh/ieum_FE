"use client"

import axios from "axios"
import { useRouter } from "next/navigation"

import { useProfileForm } from "@/features/join/hooks/use-profile-form"
import { useCompleteSocialSignup } from "@/features/social-login/hooks/use-social-mutations"
import * as socialSignupStorage from "@/features/social-login/lib/social-signup-storage"

function getApiCode(error: unknown) {
  if (!axios.isAxiosError<{ code?: string }>(error)) return undefined
  return error.response?.data?.code
}

function useSocialSignupFlow(socialSignupToken: string) {
  const router = useRouter()
  const profile = useProfileForm()
  const signupMutation = useCompleteSocialSignup()

  const handleSubmit = () => {
    if (!profile.values || !socialSignupToken) return

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
