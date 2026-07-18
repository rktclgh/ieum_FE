"use client"

import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { ChoicePill } from "@/components/ui/text-field/choice-pill"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { Title } from "@/components/ui/text-field/title"
import { NationalitySelect } from "@/features/join/components/nationality-select"
import type { ProfileFormApi } from "@/features/join/types"
import { ProfileAvatarButton } from "@/features/profile-image/components/profile-avatar-button"
import { ProfileImageEditor } from "@/features/profile-image/components/profile-image-editor"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface ProfileFormProps {
  className?: string
  flow: ProfileFormApi
}

function ProfileForm({ className, flow }: ProfileFormProps) {
  const { messages } = useTranslation()

  const {
    nickname,
    onNicknameChange,
    nicknameStatus,
    onDuplicateCheck,
    checkNicknameMutation,
    birthDateDigits,
    onBirthDateChange,
    isBirthDateInvalid,
    gender,
    setGender,
    nationality,
    onNationalityChange,
    isNextEnabled,
    onSubmit,
    signupMutation,
    avatarPreview,
    onAvatarFileSelected,
    editorSrc,
    onEditorClose,
    onCropped,
  } = flow

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-1 flex-col items-center", className)}
    >
      <div className="flex w-full flex-col gap-3 px-4 pb-32 [&>[data-slot=explanation]]:-mt-3">
        <div className="flex w-full flex-col items-center py-2">
          <ProfileAvatarButton previewUrl={avatarPreview} onFileSelected={onAvatarFileSelected} />
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.nicknameLabel} />
          <InputWithButton
            name="nickname"
            autoComplete="nickname"
            placeholder={messages.join.nicknamePlaceholder}
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            error={nicknameStatus === "duplicate"}
            buttonLabel={messages.join.nicknameDuplicateCheckButton}
            buttonDisabled={!nickname || checkNicknameMutation.isPending}
            onButtonClick={onDuplicateCheck}
          />
          {nicknameStatus === "available" && (
            <Explanation variant="great" text={messages.join.nicknameAvailableExplanation} />
          )}
          {nicknameStatus === "duplicate" && (
            <Explanation variant="error" text={messages.join.nicknameDuplicateExplanation} />
          )}
          {checkNicknameMutation.isError && (
            <Explanation
              variant="error"
              text={getApiErrorMessage(
                checkNicknameMutation.error,
                messages.join.nicknameDuplicateExplanation
              )}
            />
          )}
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.birthDateLabel} />
          <Input
            inputMode="numeric"
            name="birthDate"
            placeholder={messages.join.birthDatePlaceholder}
            value={birthDateDigits}
            onChange={(event) => onBirthDateChange(event.target.value)}
            error={isBirthDateInvalid}
          />
          <Explanation text={messages.join.birthDateHintExplanation} />
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.genderLabel} />
          <div className="flex w-full gap-3">
            <ChoicePill
              className="flex-1"
              label={messages.join.genderFemale}
              selected={gender === "female"}
              onClick={() => setGender("female")}
            />
            <ChoicePill
              className="flex-1"
              label={messages.join.genderMale}
              selected={gender === "male"}
              onClick={() => setGender("male")}
            />
          </div>
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.nationalityLabel} />
          <NationalitySelect value={nationality} onValueChange={onNationalityChange} />
        </div>

        {signupMutation.isError && (
          <Explanation
            variant="error"
            text={getApiErrorMessage(signupMutation.error, messages.join.signupErrorExplanation)}
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 app-column flex flex-col items-center gap-2 bg-white px-4 pt-2 pb-2">
        <Button
          type="submit"
          variant="primary"
          size="block"
          disabled={!isNextEnabled || signupMutation.isPending}
          className={cn(!isNextEnabled && "bg-gray-200 text-white hover:bg-gray-200")}
        >
          {messages.join.createAccountButton}
        </Button>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>

      <ProfileImageEditor
        key={editorSrc ?? "none"}
        open={editorSrc !== null}
        imageSrc={editorSrc}
        onClose={onEditorClose}
        onCropped={onCropped}
      />
    </form>
  )
}

export { ProfileForm }
