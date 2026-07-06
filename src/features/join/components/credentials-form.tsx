"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Explanation } from "@/components/ui/text-field/explanation"
import { FieldLabel } from "@/components/ui/text-field/field-label"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import {
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_REGEX,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_TIMEOUT_SECONDS,
} from "@/features/join/constants/validation"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type VerificationStatus = "idle" | "sent" | "verified"

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${remaining.toString().padStart(2, "0")}`
}

// Backend email verification isn't wired up yet, so the code is generated
// and checked entirely on the client as a placeholder.
function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

interface JoinCredentialsFormProps {
  className?: string
  onSubmit?: (values: { email: string; password: string }) => void
}

function JoinCredentialsForm({ className, onSubmit }: JoinCredentialsFormProps) {
  const { messages } = useTranslation()

  const [email, setEmail] = React.useState("")
  const [verificationCode, setVerificationCode] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [passwordConfirm, setPasswordConfirm] = React.useState("")
  const [verificationStatus, setVerificationStatus] = React.useState<VerificationStatus>("idle")
  const [secondsLeft, setSecondsLeft] = React.useState(0)
  const sentCodeRef = React.useRef("")

  React.useEffect(() => {
    if (verificationStatus !== "sent" || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [verificationStatus, secondsLeft])

  const isEmailValid = EMAIL_REGEX.test(email)
  const isEmailInvalid = email.length > 0 && !isEmailValid
  const isPasswordValid =
    password.length >= PASSWORD_MIN_LENGTH && PASSWORD_SPECIAL_CHAR_REGEX.test(password)
  const isPasswordInvalid = password.length > 0 && !isPasswordValid
  const isPasswordConfirmMatch = passwordConfirm.length > 0 && passwordConfirm === password
  const isPasswordConfirmMismatch = passwordConfirm.length > 0 && passwordConfirm !== password
  const isVerified = verificationStatus === "verified"
  const isVerificationMismatch =
    verificationStatus === "sent" &&
    verificationCode.length === VERIFICATION_CODE_LENGTH &&
    verificationCode !== sentCodeRef.current

  const isNextEnabled = isVerified && isPasswordValid && isPasswordConfirmMatch

  const handleSendVerification = () => {
    if (!isEmailValid || isVerified) return
    sentCodeRef.current = generateVerificationCode()
    setVerificationCode("")
    setVerificationStatus("sent")
    setSecondsLeft(VERIFICATION_TIMEOUT_SECONDS)
  }

  const handleVerificationCodeChange = (rawValue: string) => {
    const value = rawValue.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH)
    setVerificationCode(value)
    if (value.length === VERIFICATION_CODE_LENGTH && value === sentCodeRef.current) {
      setVerificationStatus("verified")
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isNextEnabled) return
    onSubmit?.({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex w-full flex-1 flex-col items-center", className)}>
      <div className="flex w-full flex-col gap-3 px-4 pb-32">
        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.emailLabel} />
          <div className="flex w-full flex-col gap-3">
            <InputWithButton
              type="email"
              name="email"
              autoComplete="email"
              placeholder={messages.join.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={isEmailInvalid}
              buttonLabel={
                verificationStatus === "idle"
                  ? messages.join.verifyButton
                  : messages.join.resendButton
              }
              buttonDisabled={!isEmailValid || isVerified}
              onButtonClick={handleSendVerification}
            />
            {isEmailInvalid && (
              <Explanation variant="error" text={messages.join.emailInvalidExplanation} />
            )}
            {!isEmailInvalid && verificationStatus !== "idle" && (
              <Explanation variant="great" text={messages.join.verificationSentExplanation} />
            )}
            <Input
              inputMode="numeric"
              name="verificationCode"
              placeholder={messages.join.verificationPlaceholder}
              value={verificationCode}
              onChange={(event) => handleVerificationCodeChange(event.target.value)}
              error={isVerificationMismatch}
              disabled={verificationStatus === "idle"}
              endAdornment={
                verificationStatus === "sent" ? (
                  <span className="shrink-0 text-body-medium-16 text-primary-600">
                    {formatCountdown(secondsLeft)}
                  </span>
                ) : undefined
              }
            />
            {isVerificationMismatch && (
              <Explanation
                variant="error"
                text={messages.join.verificationMismatchExplanation}
              />
            )}
            {isVerified && (
              <Explanation
                variant="great"
                text={messages.join.verificationVerifiedExplanation}
              />
            )}
          </div>
        </div>

        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.passwordLabel} />
          <PasswordInput
            name="password"
            autoComplete="new-password"
            placeholder={messages.join.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={isPasswordInvalid}
          />
          <Explanation
            variant={isPasswordInvalid ? "error" : "default"}
            text={messages.join.passwordHintExplanation}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.passwordConfirmLabel} />
          <PasswordInput
            name="passwordConfirm"
            autoComplete="new-password"
            placeholder={messages.join.passwordPlaceholder}
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            error={isPasswordConfirmMismatch}
          />
          {isPasswordConfirmMismatch && (
            <Explanation variant="error" text={messages.join.passwordMismatchExplanation} />
          )}
          {isPasswordConfirmMatch && (
            <Explanation variant="great" text={messages.join.passwordMatchExplanation} />
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-sm flex-col items-center gap-2 bg-white px-4 pt-2 pb-2">
        <Button
          type="submit"
          variant="primary"
          size="block"
          disabled={!isNextEnabled}
          className={cn(!isNextEnabled && "bg-gray-200 text-white hover:bg-gray-200")}
        >
          {messages.join.nextButton}
        </Button>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>
    </form>
  )
}

export { JoinCredentialsForm }
