"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { ChoicePill } from "@/components/ui/text-field/choice-pill"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { Title } from "@/components/ui/text-field/title"
import { NationalitySelect } from "@/features/join/components/nationality-select"
import { toIsoDate } from "@/features/join/lib/format"
import { fromIso2, toIso2 } from "@/features/join/lib/nationality-map"
import type { UpdateMeRequest } from "@/features/my/api/my-types"
import { useUpdateMe } from "@/features/my/hooks/use-my-mutations"
import { getMyErrorMessage } from "@/features/my/lib/my-error"
import type { Gender } from "@/features/session/api/session-api"
import { useMe } from "@/features/session/hooks/use-me"
import type { CountryCode } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const BIRTH_DATE_DIGIT_LENGTH = 8
const GENDER_OPTIONS: Gender[] = ["female", "male", "other"]

function formatBirthDate(digits: string) {
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
}

type MeUser = NonNullable<ReturnType<typeof useMe>["data"]>

// 컨테이너: user가 로드된 뒤에만 폼을 마운트해, 프리필용 렌더 중 setState 없이 초기값을 확정한다.
function EditProfileContent() {
  const { data: user } = useMe()
  if (!user) return null
  return <EditProfileForm user={user} />
}

function EditProfileForm({ user }: { user: MeUser }) {
  const router = useRouter()
  const { messages } = useTranslation()
  const updateMe = useUpdateMe()

  const [nickname, setNickname] = React.useState(user.nickname)
  const [birthDateDigits, setBirthDateDigits] = React.useState(
    (user.birthDate ?? "").replaceAll("-", "")
  )
  const [gender, setGender] = React.useState<Gender | null>(user.gender)
  const [nationality, setNationality] = React.useState<CountryCode | "">(
    fromIso2(user.nationality) ?? ""
  )

  const genderLabels: Record<Gender, string> = {
    female: messages.join.genderFemale,
    male: messages.join.genderMale,
    other: messages.my.edit.genderOther,
  }

  const isBirthDateComplete = birthDateDigits.length === BIRTH_DATE_DIGIT_LENGTH
  const isBirthDateInvalid = birthDateDigits.length > 0 && !isBirthDateComplete
  const isNicknameValid = nickname.trim().length >= 2

  const nextBirthDate =
    isBirthDateComplete ? toIsoDate(formatBirthDate(birthDateDigits)) : undefined
  const nextNationality = nationality ? toIso2(nationality) : undefined

  const payload: UpdateMeRequest = {}
  if (isNicknameValid && nickname !== user.nickname) payload.nickname = nickname
  if (nextBirthDate && nextBirthDate !== user.birthDate) payload.birthDate = nextBirthDate
  if (gender && gender !== user.gender) payload.gender = gender
  if (nextNationality && nextNationality !== user.nationality) payload.nationality = nextNationality

  const hasChanges = Object.keys(payload).length > 0
  const isFormValid = isNicknameValid && !isBirthDateInvalid && gender !== null && nationality !== ""
  const canSave = hasChanges && isFormValid && !updateMe.isPending

  const errorCode = updateMe.isError
    ? getMyErrorMessage(updateMe.error, messages)
    : null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    updateMe.mutate(payload, { onSuccess: () => router.back() })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
      <AppBar
        title={messages.my.edit.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col gap-3 px-4 pb-32 [&>[data-slot=explanation]]:-mt-3">
        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.nicknameLabel} />
          <Input
            name="nickname"
            autoComplete="nickname"
            placeholder={messages.join.nicknamePlaceholder}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={updateMe.isError}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.birthDateLabel} />
          <Input
            inputMode="numeric"
            name="birthDate"
            placeholder={messages.join.birthDatePlaceholder}
            value={formatBirthDate(birthDateDigits)}
            onChange={(event) =>
              setBirthDateDigits(
                event.target.value.replace(/\D/g, "").slice(0, BIRTH_DATE_DIGIT_LENGTH)
              )
            }
            error={isBirthDateInvalid}
          />
          <Explanation text={messages.join.birthDateHintExplanation} />
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.genderLabel} />
          <div className="flex w-full gap-3">
            {GENDER_OPTIONS.map((option) => (
              <ChoicePill
                key={option}
                className="flex-1"
                label={genderLabels[option]}
                selected={gender === option}
                onClick={() => setGender(option)}
              />
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.nationalityLabel} />
          <NationalitySelect
            value={nationality}
            onValueChange={(value) => setNationality(value as CountryCode)}
          />
        </div>

        {errorCode && <Explanation variant="error" text={errorCode} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-sm flex-col items-center gap-2 bg-white px-4 pt-2 pb-2">
        <Button
          type="submit"
          variant="primary"
          size="block"
          disabled={!canSave}
          className={cn(!canSave && "bg-gray-200 text-white hover:bg-gray-200")}
        >
          {messages.my.edit.saveButton}
        </Button>
        <span className="h-1 w-[135px] rounded-full bg-gray-900" />
      </div>
    </form>
  )
}

export { EditProfileContent }
