"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { ChoicePill } from "@/components/ui/text-field/choice-pill"
import { Explanation } from "@/components/ui/text-field/explanation"
import { FieldLabel } from "@/components/ui/text-field/field-label"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { NationalitySelect } from "@/features/join/components/nationality-select"
import { BIRTH_DATE_DIGIT_LENGTH, TAKEN_NICKNAMES } from "@/features/join/constants/validation"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type NicknameStatus = "idle" | "available" | "duplicate"
type Gender = "female" | "male"

function formatBirthDate(digits: string) {
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
}

export interface ProfileFormValues {
  nickname: string
  birthDate: string
  gender: Gender
  nationality: string
}

interface ProfileFormProps {
  className?: string
  onSubmit?: (values: ProfileFormValues) => void
}

function ProfileForm({ className, onSubmit }: ProfileFormProps) {
  const { messages } = useTranslation()

  const [nickname, setNickname] = React.useState("")
  const [nicknameStatus, setNicknameStatus] = React.useState<NicknameStatus>("idle")
  const [birthDateDigits, setBirthDateDigits] = React.useState("")
  const [gender, setGender] = React.useState<Gender | null>(null)
  const [nationality, setNationality] = React.useState("")

  const isBirthDateComplete = birthDateDigits.length === BIRTH_DATE_DIGIT_LENGTH
  const isBirthDateInvalid = birthDateDigits.length > 0 && !isBirthDateComplete

  const isNextEnabled =
    nicknameStatus === "available" && isBirthDateComplete && gender !== null && nationality !== ""

  const handleNicknameChange = (rawValue: string) => {
    setNickname(rawValue)
    setNicknameStatus("idle")
  }

  const handleDuplicateCheck = () => {
    if (!nickname) return
    setNicknameStatus(TAKEN_NICKNAMES.includes(nickname) ? "duplicate" : "available")
  }

  const handleBirthDateChange = (rawValue: string) => {
    setBirthDateDigits(rawValue.replace(/\D/g, "").slice(0, BIRTH_DATE_DIGIT_LENGTH))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isNextEnabled || gender === null) return
    onSubmit?.({ nickname, birthDate: formatBirthDate(birthDateDigits), gender, nationality })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-1 flex-col items-center", className)}
    >
      <div className="flex w-full flex-col gap-3 px-4 pb-32">
        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.nicknameLabel} />
          <InputWithButton
            name="nickname"
            autoComplete="nickname"
            placeholder={messages.join.nicknamePlaceholder}
            value={nickname}
            onChange={(event) => handleNicknameChange(event.target.value)}
            error={nicknameStatus === "duplicate"}
            buttonLabel={messages.join.nicknameDuplicateCheckButton}
            buttonDisabled={!nickname}
            onButtonClick={handleDuplicateCheck}
          />
          {nicknameStatus === "available" && (
            <Explanation variant="great" text={messages.join.nicknameAvailableExplanation} />
          )}
          {nicknameStatus === "duplicate" && (
            <Explanation variant="error" text={messages.join.nicknameDuplicateExplanation} />
          )}
        </div>

        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.birthDateLabel} />
          <Input
            inputMode="numeric"
            name="birthDate"
            placeholder={messages.join.birthDatePlaceholder}
            value={formatBirthDate(birthDateDigits)}
            onChange={(event) => handleBirthDateChange(event.target.value)}
            error={isBirthDateInvalid}
          />
          <Explanation text={messages.join.birthDateHintExplanation} />
        </div>

        <div className="flex w-full flex-col items-start">
          <FieldLabel text={messages.join.genderLabel} />
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
          <FieldLabel text={messages.join.nationalityLabel} />
          <NationalitySelect value={nationality} onValueChange={setNationality} />
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
          {messages.join.createAccountButton}
        </Button>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>
    </form>
  )
}

export { ProfileForm }
