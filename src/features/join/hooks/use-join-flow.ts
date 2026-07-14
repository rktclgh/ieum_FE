"use client"

import * as React from "react"

import {
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_REGEX,
  VERIFICATION_CODE_LENGTH,
} from "@/features/join/constants/validation"
import {
  useCheckEmailDuplicate,
  useSendEmailVerificationCode,
  useSignup,
  useVerifyEmailVerificationCode,
} from "@/features/join/hooks/use-join-mutations"
import { useProfileForm } from "@/features/join/hooks/use-profile-form"
import type { JoinStep } from "@/features/join/types"
import { login } from "@/features/login/api/auth-api"
import { updateProfileImage } from "@/features/profile-image/api/profile-image-api"
import { useAvatarCropState } from "@/features/profile-image/hooks/use-avatar-crop-state"
import { uploadImage } from "@/lib/files/upload-image"

type VerificationStatus = "idle" | "sent" | "verified"

interface UseJoinFlowOptions {
  onSignupSuccess?: () => void
  onAutoLoginFailed?: () => void
}

function useJoinFlow({ onSignupSuccess, onAutoLoginFailed }: UseJoinFlowOptions = {}) {
  const [step, setStep] = React.useState<JoinStep>("credentials")

  const [email, setEmail] = React.useState("")
  const [verificationCode, setVerificationCode] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [passwordConfirm, setPasswordConfirm] = React.useState("")
  const [verificationStatus, setVerificationStatus] =
    React.useState<VerificationStatus>("idle")
  const [secondsLeft, setSecondsLeft] = React.useState(0)
  const [emailVerificationToken, setEmailVerificationToken] = React.useState("")
  const [isEmailDuplicate, setIsEmailDuplicate] = React.useState(false)
  // 이메일 형식 에러는 타이핑 중이 아니라 "인증하기" 버튼을 눌렀을 때만 표출한다.
  const [showEmailError, setShowEmailError] = React.useState(false)
  const avatarCrop = useAvatarCropState()

  const checkEmailMutation = useCheckEmailDuplicate()
  const sendCodeMutation = useSendEmailVerificationCode()
  const verifyCodeMutation = useVerifyEmailVerificationCode()
  const profile = useProfileForm()
  const signupMutation = useSignup()

  React.useEffect(() => {
    if (verificationStatus !== "sent" || secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [verificationStatus, secondsLeft])

  const isEmailValid = EMAIL_REGEX.test(email)
  const isEmailInvalid = showEmailError && !isEmailValid
  const isPasswordValid =
    password.length >= PASSWORD_MIN_LENGTH && PASSWORD_SPECIAL_CHAR_REGEX.test(password)
  const isPasswordInvalid = password.length > 0 && !isPasswordValid
  const isPasswordConfirmMatch = passwordConfirm.length > 0 && passwordConfirm === password
  const isPasswordConfirmMismatch = passwordConfirm.length > 0 && passwordConfirm !== password
  const isVerified = verificationStatus === "verified"
  const isVerificationExpired = verificationStatus === "sent" && secondsLeft <= 0
  const isVerificationMismatch =
    verificationStatus === "sent" && !isVerificationExpired && verifyCodeMutation.isError
  const isCredentialsStepValid = isVerified && isPasswordValid && isPasswordConfirmMatch

  const handleEmailChange = (rawValue: string) => {
    setEmail(rawValue)
    setIsEmailDuplicate(false)
    setShowEmailError(false)
    if (checkEmailMutation.isError) checkEmailMutation.reset()
    if (sendCodeMutation.isError) sendCodeMutation.reset()
    if (verificationStatus !== "idle") {
      setVerificationStatus("idle")
      setSecondsLeft(0)
      setEmailVerificationToken("")
      setVerificationCode("")
      verifyCodeMutation.reset()
    }
  }

  const handleSendVerification = () => {
    if (isVerified) return
    // 인증하기 클릭 시점에 형식 검사 → 실패하면 이 시점에만 에러를 표출한다.
    if (!isEmailValid) {
      setShowEmailError(true)
      return
    }
    setShowEmailError(false)
    verifyCodeMutation.reset()
    checkEmailMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          if (!data.available) {
            setIsEmailDuplicate(true)
            return
          }
          setIsEmailDuplicate(false)
          sendCodeMutation.mutate(
            { email },
            {
              onSuccess: (sendData) => {
                setVerificationCode("")
                setVerificationStatus("sent")
                setSecondsLeft(sendData.expiresInSeconds)
              },
            }
          )
        },
      }
    )
  }

  const handleVerificationCodeChange = (rawValue: string) => {
    const value = rawValue.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH)
    setVerificationCode(value)
    if (verifyCodeMutation.isError) verifyCodeMutation.reset()
    if (value.length === VERIFICATION_CODE_LENGTH && secondsLeft > 0) {
      verifyCodeMutation.mutate(
        { email, code: value },
        {
          onSuccess: (data) => {
            setEmailVerificationToken(data.emailVerificationToken)
            setVerificationStatus("verified")
          },
        }
      )
    }
  }

  const handleCredentialsSubmit = () => {
    if (!isCredentialsStepValid) return
    setStep("profile")
  }

  const handleSignupSubmit = () => {
    if (!profile.values) return
    signupMutation.mutate(
      { email, password, ...profile.values, emailVerificationToken },
      {
        onSuccess: async () => {
          try {
            await login({ email, password })
          } catch {
            // 자동로그인 실패 시 사진 업로드는 건너뛰고 /login 으로 폴백 이동시킨다(비로그인 상태로 홈 진입 방지).
            onAutoLoginFailed?.()
            return
          }
          if (avatarCrop.croppedBlob) {
            try {
              const fileId = await uploadImage(avatarCrop.croppedBlob, "profile")
              await updateProfileImage(fileId)
            } catch {
              // 사진 업로드 실패는 가입/로그인 완료를 막지 않는다(마이에서 재시도 가능)
            }
          }
          onSignupSuccess?.()
        },
      }
    )
  }

  return {
    step,
    setStep,
    credentials: {
      email,
      onEmailChange: handleEmailChange,
      password,
      setPassword,
      passwordConfirm,
      setPasswordConfirm,
      verificationCode,
      onVerificationCodeChange: handleVerificationCodeChange,
      verificationStatus,
      secondsLeft,
      isEmailInvalid,
      isEmailDuplicate,
      isPasswordInvalid,
      isPasswordConfirmMatch,
      isPasswordConfirmMismatch,
      isVerified,
      isVerificationMismatch,
      isVerificationExpired,
      isNextEnabled: isCredentialsStepValid,
      onSendVerification: handleSendVerification,
      onSubmit: handleCredentialsSubmit,
      checkEmailMutation,
      sendCodeMutation,
      verifyCodeMutation,
    },
    profile: {
      ...profile,
      isNextEnabled: profile.isValid,
      onSubmit: handleSignupSubmit,
      signupMutation,
      ...avatarCrop,
    },
  }
}

export { useJoinFlow }
