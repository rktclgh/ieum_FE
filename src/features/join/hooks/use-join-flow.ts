"use client"

import * as React from "react"

import {
  BIRTH_DATE_DIGIT_LENGTH,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_REGEX,
  VERIFICATION_CODE_LENGTH,
} from "@/features/join/constants/validation"
import {
  useCheckEmailDuplicate,
  useCheckNicknameDuplicate,
  useSendEmailVerificationCode,
  useSignup,
  useVerifyEmailVerificationCode,
} from "@/features/join/hooks/use-join-mutations"
import { toIsoDate } from "@/features/join/lib/format"
import { toIso2 } from "@/features/join/lib/nationality-map"
import type { JoinStep } from "@/features/join/types"
import type { CountryCode } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"

type VerificationStatus = "idle" | "sent" | "verified"
type NicknameStatus = "idle" | "available" | "duplicate"
type Gender = "female" | "male"

function formatBirthDate(digits: string) {
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
}

interface UseJoinFlowOptions {
  onSignupSuccess?: () => void
}

function useJoinFlow({ onSignupSuccess }: UseJoinFlowOptions = {}) {
  const { language } = useTranslation()

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

  const [nickname, setNickname] = React.useState("")
  const [nicknameStatus, setNicknameStatus] = React.useState<NicknameStatus>("idle")
  const [birthDateDigits, setBirthDateDigits] = React.useState("")
  const [gender, setGender] = React.useState<Gender | null>(null)
  const [nationality, setNationality] = React.useState<CountryCode | "">("")

  const checkEmailMutation = useCheckEmailDuplicate()
  const sendCodeMutation = useSendEmailVerificationCode()
  const verifyCodeMutation = useVerifyEmailVerificationCode()
  const checkNicknameMutation = useCheckNicknameDuplicate()
  const signupMutation = useSignup()

  React.useEffect(() => {
    if (verificationStatus !== "sent" || secondsLeft <= 0) return
    const timer = setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [verificationStatus, secondsLeft])

  const isEmailValid = EMAIL_REGEX.test(email)
  const isEmailInvalid = email.length > 0 && !isEmailValid
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

  const isBirthDateComplete = birthDateDigits.length === BIRTH_DATE_DIGIT_LENGTH
  const isBirthDateInvalid = birthDateDigits.length > 0 && !isBirthDateComplete
  const isProfileStepValid =
    nicknameStatus === "available" && isBirthDateComplete && gender !== null && nationality !== ""

  const handleEmailChange = (rawValue: string) => {
    setEmail(rawValue)
    setIsEmailDuplicate(false)
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
    if (!isEmailValid || isVerified) return
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

  const handleNicknameChange = (rawValue: string) => {
    setNickname(rawValue)
    setNicknameStatus("idle")
    if (checkNicknameMutation.isError) checkNicknameMutation.reset()
  }

  const handleNicknameDuplicateCheck = () => {
    if (!nickname) return
    checkNicknameMutation.mutate(
      { nickname },
      {
        onSuccess: (data) => {
          setNicknameStatus(data.available ? "available" : "duplicate")
        },
      }
    )
  }

  const handleBirthDateChange = (rawValue: string) => {
    setBirthDateDigits(rawValue.replace(/\D/g, "").slice(0, BIRTH_DATE_DIGIT_LENGTH))
  }

  const handleSignupSubmit = () => {
    if (!isProfileStepValid || gender === null) return
    signupMutation.mutate(
      {
        email,
        password,
        nickname,
        birthDate: toIsoDate(formatBirthDate(birthDateDigits)),
        gender,
        nationality: toIso2(nationality),
        language,
        emailVerificationToken,
      },
      { onSuccess: onSignupSuccess }
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
      nickname,
      onNicknameChange: handleNicknameChange,
      nicknameStatus,
      onDuplicateCheck: handleNicknameDuplicateCheck,
      checkNicknameMutation,
      birthDateDigits: formatBirthDate(birthDateDigits),
      onBirthDateChange: handleBirthDateChange,
      isBirthDateInvalid,
      gender,
      setGender,
      nationality,
      onNationalityChange: (value: string) => setNationality(value as CountryCode),
      isNextEnabled: isProfileStepValid,
      onSubmit: handleSignupSubmit,
      signupMutation,
    },
  }
}

export { useJoinFlow }
