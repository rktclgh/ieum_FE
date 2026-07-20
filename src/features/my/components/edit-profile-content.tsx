"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { ChoicePill } from "@/components/ui/text-field/choice-pill"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { InputWithButton } from "@/components/ui/text-field/input-with-button"
import { Title } from "@/components/ui/text-field/title"
import { NationalitySelect } from "@/features/join/components/nationality-select"
import { useCheckNicknameDuplicate } from "@/features/join/hooks/use-join-mutations"
import { toIsoDate } from "@/features/join/lib/format"
import { fromIso2, toIso2 } from "@/features/join/lib/nationality-map"
import type { NicknameStatus } from "@/features/join/types"
import type { UpdateMeRequest } from "@/features/my/api/my-types"
import { useUpdateMe } from "@/features/my/hooks/use-my-mutations"
import { getMyErrorMessage } from "@/features/my/lib/my-error"
import { ProfileAvatarButton } from "@/features/profile-image/components/profile-avatar-button"
import { ProfileImageEditor } from "@/features/profile-image/components/profile-image-editor"
import { useDeleteProfileImage, useProfileImageUpload } from "@/features/profile-image/hooks/use-profile-image"
import type { Gender } from "@/features/session/api/session-api"
import { useMe } from "@/features/session/hooks/use-me"
import { resolveFileUrl } from "@/lib/api/file-url"
import type { CountryCode } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const BIRTH_DATE_DIGIT_LENGTH = 8
// 디자인 결정(#87): UI는 여성/남성 2개만 노출. (BE는 other를 유지하나 프로필 수정에선 제외)
const GENDER_OPTIONS = ["female", "male"] as const satisfies readonly Gender[]
const NICKNAME_MIN_LENGTH = 2

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
  const { upload, isUploading } = useProfileImageUpload()
  const { remove } = useDeleteProfileImage()
  const [editorSrc, setEditorSrc] = React.useState<string | null>(null)
  const [profileImageUploadError, setProfileImageUploadError] = React.useState<string | null>(null)
  const [hasProfileImageChange, setHasProfileImageChange] = React.useState(false)

  const handleFileSelected = (file: File) => {
    setProfileImageUploadError(null)
    // 방어적: 편집기 재선택 시 이전 objectURL 을 먼저 폐기해 리크를 막는다.
    if (editorSrc) URL.revokeObjectURL(editorSrc)
    setEditorSrc(URL.createObjectURL(file))
  }

  const handleCropped = async (blob: Blob) => {
    setProfileImageUploadError(null)
    try {
      await upload(blob)
      setHasProfileImageChange(true)
    } catch {
      setProfileImageUploadError(messages.profileImage.uploadFailed)
    }
  }

  const handleDelete = async () => {
    try {
      await remove()
      setHasProfileImageChange(true)
    } catch {
      // 삭제 실패 시 me 캐시는 그대로 — 아바타를 현재 상태로 유지한다
    }
  }

  const [nickname, setNickname] = React.useState(user.nickname)
  const [nicknameStatus, setNicknameStatus] = React.useState<NicknameStatus>("idle")
  const [birthDateDigits, setBirthDateDigits] = React.useState(
    (user.birthDate ?? "").replaceAll("-", "")
  )
  const [gender, setGender] = React.useState<Gender | null>(user.gender)
  const [nationality, setNationality] = React.useState<CountryCode | "">(
    fromIso2(user.nationality) ?? ""
  )

  const checkNickname = useCheckNicknameDuplicate()
  const latestNicknameRef = React.useRef(nickname)

  const genderLabels: Record<(typeof GENDER_OPTIONS)[number], string> = {
    female: messages.join.genderFemale,
    male: messages.join.genderMale,
  }

  const trimmedNickname = nickname.trim()
  const isNicknameValid = trimmedNickname.length >= NICKNAME_MIN_LENGTH
  // 본인 현재 닉네임과 같으면 중복확인 불필요(skip): 그대로 유효로 취급한다.
  const isNicknameChanged = trimmedNickname !== user.nickname
  const isNicknameConfirmed = !isNicknameChanged || nicknameStatus === "available"

  const isBirthDateComplete = birthDateDigits.length === BIRTH_DATE_DIGIT_LENGTH
  const isBirthDateInvalid = birthDateDigits.length > 0 && !isBirthDateComplete

  const handleNicknameChange = (rawValue: string) => {
    latestNicknameRef.current = rawValue
    setNickname(rawValue)
    setNicknameStatus("idle")
    if (checkNickname.isError) checkNickname.reset()
  }

  const handleNicknameDuplicateCheck = () => {
    if (!isNicknameValid) return
    // 닉네임 미변경 시 백엔드 호출 없이 통과 처리(본인 닉네임을 "이미 사용중"으로 오탐 방지).
    if (!isNicknameChanged) {
      setNicknameStatus("available")
      return
    }
    const requested = trimmedNickname
    checkNickname.mutate(
      { nickname: requested },
      {
        onSuccess: (data) => {
          if (latestNicknameRef.current.trim() !== requested) return
          setNicknameStatus(data.available ? "available" : "duplicate")
        },
      }
    )
  }

  const nextBirthDate =
    isBirthDateComplete ? toIsoDate(formatBirthDate(birthDateDigits)) : undefined
  const nextNationality = nationality ? toIso2(nationality) : undefined

  const payload: UpdateMeRequest = {}
  if (isNicknameValid && isNicknameChanged) payload.nickname = trimmedNickname
  if (nextBirthDate && nextBirthDate !== user.birthDate) payload.birthDate = nextBirthDate
  if (gender && gender !== user.gender) payload.gender = gender
  if (nextNationality && nextNationality !== user.nationality) payload.nationality = nextNationality

  const hasTextChanges = Object.keys(payload).length > 0
  const hasChanges = hasTextChanges || hasProfileImageChange
  const isFormValid =
    isNicknameValid && isNicknameConfirmed && !isBirthDateInvalid && gender !== null && nationality !== ""
  const canSave = hasChanges && isFormValid && !updateMe.isPending

  const errorCode = updateMe.isError
    ? getMyErrorMessage(updateMe.error, messages)
    : null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    // 저장 후에도 화면을 떠나지 않는다. 갱신된 me 캐시로 payload 가 비어
    // 저장 버튼이 자동으로 비활성화되는 것이 완료 피드백 역할을 한다.
    if (!hasTextChanges) {
      setHasProfileImageChange(false)
      return
    }
    updateMe.mutate(payload, { onSuccess: () => setHasProfileImageChange(false) })
  }

  return (
    <form onSubmit={handleSubmit} className="app-column flex min-h-dvh flex-col">
      <AppBar
        title={messages.my.edit.title}
        trailingIcon={null}
        onLeadingClick={() => router.back()}
      />

      <div className="flex w-full flex-col gap-3 px-4 pb-[calc(8rem+var(--safe-area-bottom))] [&>[data-slot=explanation]]:-mt-3">
        <div className="flex w-full flex-col items-center py-4">
          <ProfileAvatarButton
            previewUrl={resolveFileUrl(user.profileImageUrl) ?? null}
            onFileSelected={handleFileSelected}
            className={cn(isUploading && "pointer-events-none opacity-50")}
          />
          {user.profileImageUrl && (
            <button
              type="button"
              onClick={handleDelete}
              className="mt-2 text-body-regular-14 text-gray-500"
            >
              {messages.profileImage.deleteLabel}
            </button>
          )}
          {profileImageUploadError && (
            <Explanation
              variant="error"
              role="alert"
              text={profileImageUploadError}
              className="mt-2"
            />
          )}
        </div>

        <ProfileImageEditor
          open={editorSrc !== null}
          imageSrc={editorSrc}
          onClose={() => {
            if (editorSrc) URL.revokeObjectURL(editorSrc)
            setEditorSrc(null)
          }}
          onCropped={handleCropped}
        />

        <div className="flex w-full flex-col items-start">
          <Title text={messages.join.nicknameLabel} />
          <InputWithButton
            name="nickname"
            autoComplete="nickname"
            placeholder={messages.join.nicknamePlaceholder}
            value={nickname}
            onChange={(event) => handleNicknameChange(event.target.value)}
            error={nicknameStatus === "duplicate"}
            buttonLabel={messages.join.nicknameDuplicateCheckButton}
            onButtonClick={handleNicknameDuplicateCheck}
            buttonDisabled={
              !isNicknameValid ||
              !isNicknameChanged ||
              nicknameStatus === "available" ||
              checkNickname.isPending
            }
          />
          {nicknameStatus === "available" && (
            <Explanation variant="great" text={messages.join.nicknameAvailableExplanation} />
          )}
          {nicknameStatus === "duplicate" && (
            <Explanation variant="error" text={messages.join.nicknameDuplicateExplanation} />
          )}
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

      <div className="app-bottom-fixed z-10 app-column flex flex-col items-center gap-2 bg-white px-4 pt-2 pb-[calc(0.5rem+max(var(--safe-area-bottom),var(--keyboard-inset,0px)))]">
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
