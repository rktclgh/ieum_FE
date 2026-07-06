"use client"

import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Explanation } from "@/components/ui/text-field/explanation"
import { FieldLabel } from "@/components/ui/text-field/field-label"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import { useJoinFlow } from "@/features/join/hooks/use-join-flow"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${remaining.toString().padStart(2, "0")}`
}

interface CredentialsFormProps {
  className?: string
  flow: ReturnType<typeof useJoinFlow>["credentials"]
}

function CredentialsForm({ className, flow }: CredentialsFormProps) {
  const { messages } = useTranslation()

  const {
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    verificationCode,
    onVerificationCodeChange,
    verificationStatus,
    secondsLeft,
    isEmailInvalid,
    isPasswordInvalid,
    isPasswordConfirmMatch,
    isPasswordConfirmMismatch,
    isVerified,
    isVerificationMismatch,
    isNextEnabled,
    onSendVerification,
    onSubmit,
    sendCodeMutation,
    verifyCodeMutation,
  } = flow

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex w-full flex-1 flex-col items-center", className)}>
      <div className="flex w-full flex-col gap-3 px-4 pb-32">
        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.emailLabel} />
          <div className="flex w-full flex-col gap-3 [&>[data-slot=explanation]]:-mt-3">
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
              buttonDisabled={isEmailInvalid || !email || isVerified || sendCodeMutation.isPending}
              onButtonClick={onSendVerification}
            />
            {isEmailInvalid && (
              <Explanation variant="error" text={messages.join.emailInvalidExplanation} />
            )}
            {sendCodeMutation.isError && (
              <Explanation
                variant="error"
                text={getApiErrorMessage(
                  sendCodeMutation.error,
                  messages.join.emailSendCodeErrorExplanation
                )}
              />
            )}
            {!isEmailInvalid && !sendCodeMutation.isError && verificationStatus !== "idle" && (
              <Explanation variant="great" text={messages.join.verificationSentExplanation} />
            )}
            <Input
              inputMode="numeric"
              name="verificationCode"
              placeholder={messages.join.verificationPlaceholder}
              value={verificationCode}
              onChange={(event) => onVerificationCodeChange(event.target.value)}
              error={isVerificationMismatch}
              disabled={verificationStatus === "idle" || verifyCodeMutation.isPending}
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
                text={getApiErrorMessage(
                  verifyCodeMutation.error,
                  messages.join.verificationMismatchExplanation
                )}
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

export { CredentialsForm }
