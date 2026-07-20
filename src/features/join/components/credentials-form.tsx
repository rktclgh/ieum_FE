"use client"

import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { PasswordInput } from "@/components/ui/text-field/password-input"
import { SelectInput } from "@/components/ui/text-field/select-input"
import { Title } from "@/components/ui/text-field/title"
import { useJoinFlow } from "@/features/join/hooks/use-join-flow"
import { getApiErrorMessage } from "@/lib/api/errors"
import { LANGUAGE_CODES, LANGUAGE_NATIVE_NAMES, type LanguageCode } from "@/lib/i18n/languages"
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
  const { messages, language, setLanguage } = useTranslation()

  const {
    email,
    onEmailChange,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    verificationCode,
    onVerificationCodeChange,
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
    isNextEnabled,
    onSendVerification,
    onSubmit,
    checkEmailMutation,
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
          <Title text={messages.join.languageLabel} />
          <SelectInput
            options={LANGUAGE_CODES.map((code) => ({
              value: code,
              label: LANGUAGE_NATIVE_NAMES[code],
            }))}
            value={language}
            onValueChange={(value) => setLanguage(value as LanguageCode)}
            confirmLabel={messages.languagePicker.confirm}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.emailLabel} />
          <div className="flex w-full flex-col gap-3 [&>[data-slot=explanation]]:-mt-3">
            <InputWithButton
              type="email"
              name="email"
              autoComplete="email"
              placeholder={messages.join.emailPlaceholder}
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              error={isEmailInvalid || isEmailDuplicate}
              buttonLabel={
                verificationStatus === "idle"
                  ? messages.join.verifyButton
                  : messages.join.resendButton
              }
              buttonDisabled={
                !email ||
                isVerified ||
                checkEmailMutation.isPending ||
                sendCodeMutation.isPending
              }
              onButtonClick={onSendVerification}
            />
            {isEmailInvalid && (
              <Explanation variant="error" text={messages.join.emailInvalidExplanation} />
            )}
            {!isEmailInvalid && isEmailDuplicate && (
              <Explanation variant="error" text={messages.join.emailDuplicateExplanation} />
            )}
            {!isEmailInvalid && !isEmailDuplicate && checkEmailMutation.isError && (
              <Explanation
                variant="error"
                text={getApiErrorMessage(
                  checkEmailMutation.error,
                  messages.join.emailSendCodeErrorExplanation
                )}
              />
            )}
            {!isEmailInvalid &&
              !isEmailDuplicate &&
              !checkEmailMutation.isError &&
              sendCodeMutation.isError && (
                <Explanation
                  variant="error"
                  text={getApiErrorMessage(
                    sendCodeMutation.error,
                    messages.join.emailSendCodeErrorExplanation
                  )}
                />
              )}
            {!isEmailInvalid &&
              !isEmailDuplicate &&
              !checkEmailMutation.isError &&
              !sendCodeMutation.isError &&
              verificationStatus !== "idle" && (
                <Explanation variant="great" text={messages.join.verificationSentExplanation} />
              )}
            <Input
              inputMode="numeric"
              name="verificationCode"
              placeholder={messages.join.verificationPlaceholder}
              value={verificationCode}
              onChange={(event) => onVerificationCodeChange(event.target.value)}
              error={isVerificationMismatch || isVerificationExpired}
              disabled={
                verificationStatus === "idle" ||
                verifyCodeMutation.isPending ||
                isVerificationExpired ||
                isVerified
              }
              endAdornment={
                verificationStatus === "sent" ? (
                  <span className="shrink-0 text-body-medium-16 text-primary">
                    {formatCountdown(secondsLeft)}
                  </span>
                ) : undefined
              }
            />
            {isVerificationExpired && (
              <Explanation variant="error" text={messages.join.verificationExpiredExplanation} />
            )}
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
          <Title text={messages.join.passwordLabel} />
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
          <Title text={messages.join.passwordConfirmLabel} />
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

      <div className="app-bottom-fixed bottom-anchor-auto z-10 app-column flex flex-col items-center gap-2 bg-white px-4 pt-2 pb-[calc(0.5rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))]">
        <Button
          type="submit"
          variant="primary"
          size="block"
          disabled={!isNextEnabled}
        >
          {messages.join.nextButton}
        </Button>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>
    </form>
  )
}

export { CredentialsForm }
