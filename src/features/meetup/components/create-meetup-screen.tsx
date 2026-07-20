"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { Explanation } from "@/components/ui/text-field/explanation"
import { Input } from "@/components/ui/text-field/input"
import { SelectField } from "@/components/ui/text-field/select-field"
import { Textarea } from "@/components/ui/text-field/textarea"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { uploadMeetingImage } from "@/features/meetup/api/meetup-file-api"
import {
  DEFAULT_MAX_MEMBERS,
  TITLE_MAX_LENGTH,
  formatDateValue,
  formatTimeValue,
  type MeetupPlaceValue,
} from "@/features/meetup/constants/create-meetup"
import { MeetupDatePicker } from "@/features/meetup/components/meetup-date-picker"
import { MeetupImagePicker } from "@/features/meetup/components/meetup-image-picker"
import { MeetupLocationPicker } from "@/features/meetup/components/meetup-location-picker"
import { MeetupTimePicker } from "@/features/meetup/components/meetup-time-picker"
import { useCreateMeetupForm } from "@/features/meetup/hooks/use-create-meetup-form"
import { useCreateMeeting } from "@/features/meetup/hooks/use-meetup-mutations"
import { buildMeetupSchedule } from "@/features/meetup/lib/create-meetup-schedule"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface CreateMeetupScreenProps extends CreateMeetupScreenContentProps {
  open: boolean
}

/**
 * 새 모임 작성 풀스크린 오버레이. 지도 홈 FAB의 "모임 만들기"에서 열린다.
 * 제목·날짜·시간·장소·내용을 채우면 제출 버튼이 활성화되고, 제출 시 POST /meetings 로 생성한다.
 * 장소는 Figma 지도 기반 MeetupLocationPicker에서 좌표(lat/lng)·주소·라벨까지 확보한다.
 *
 * 폼 상태는 Content가 들고 있어 오버레이가 닫히면 함께 언마운트된다(다시 열면 빈 폼).
 */
function CreateMeetupScreen({ open, ...props }: CreateMeetupScreenProps) {
  return (
    <FullScreenOverlay
      open={open}
      className="z-50 app-column flex flex-col bg-white"
    >
      <CreateMeetupScreenContent {...props} />
    </FullScreenOverlay>
  )
}

interface CreateMeetupScreenContentProps {
  /** 닫기(X) 또는 제출 완료 시 호출 — 오버레이 언마운트는 부모가 담당 */
  onClose: () => void
  /** 지도 홈 핀에서 넘어온 초기 장소 — 있으면 장소 칸을 프리필한다 */
  initialPlace?: MeetupPlaceValue | null
  /** 지도 홈이 이미 확보한 최신 GPS 좌표 — 장소 picker의 첫 지도 중심에 사용한다 */
  currentPosition?: Coordinates | null
}

function CreateMeetupScreenContent({
  onClose,
  initialPlace = null,
  currentPosition = null,
}: CreateMeetupScreenContentProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup
  const form = useCreateMeetupForm(initialPlace)
  const createMeeting = useCreateMeeting()

  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [timePickerOpen, setTimePickerOpen] = React.useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false)
  const [titleFocused, setTitleFocused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // 같은 파일 재선택 허용
    if (!file) return
    // 고해상도 원본을 base64로 상태에 담으면 메모리 부담이 커, 5MB 초과분은 받지 않는다.
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_IMAGE_SIZE) return
    const reader = new FileReader()
    reader.onload = () => form.setImage({ preview: reader.result as string, file })
    reader.readAsDataURL(file)
  }

  const periodLabel = form.time
    ? form.time.period === "am"
      ? t.amLabel
      : t.pmLabel
    : ""

  const dateValue = form.date ? formatDateValue(form.date) : null
  const timeValue = form.time ? formatTimeValue(form.time, periodLabel) : null

  const submitting = createMeeting.isPending

  const handleSubmit = async () => {
    if (!form.canSubmit || submitting) return
    if (!form.place) return
    setError(null)

    const schedule = buildMeetupSchedule({
      date: form.date,
      time: form.time,
      isDateUndecided: form.isDateUndecided,
      isTimeUndecided: form.isTimeUndecided,
    })

    // 이미지 업로드 실패와 모임 생성 실패를 구분해, 원인에 맞는 메시지를 노출한다.
    let imageFileId: string | undefined
    if (form.image) {
      try {
        imageFileId = await uploadMeetingImage(form.image.file)
      } catch {
        setError(t.imageUploadFailed)
        return
      }
    }

    try {
      await createMeeting.mutateAsync({
        title: form.title.trim(),
        content: form.description.trim() || undefined,
        type: "one_time",
        location: {
          lat: form.place.lat,
          lng: form.place.lng,
          address: form.place.address,
          label: form.place.label,
        },
        ...(schedule ? { schedule } : {}),
        maxMembers: DEFAULT_MAX_MEMBERS,
        imageFileId,
      })
      onClose()
    } catch (err) {
      setError(getMeetupErrorMessage(err, messages))
    }
  }

  return (
    <>
      <AppBar
        title={t.appBarTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
        className="shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
        {/* 제목 — 15자(공백 포함)까지만 입력 가능, 포커스 시 카운터 표시 */}
        <Input
          value={form.title}
          // maxLength만으로는 한글(IME) 조합 중 16번째 글자가 새어 들어가므로 상태에서 직접 자름
          onChange={(event) => form.setTitle(event.target.value.slice(0, TITLE_MAX_LENGTH))}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder={t.titlePlaceholder}
          // 포커스 중에만 카운터, 그 밖에는 Input 기본 지우기 버튼을 그대로 쓴다
          endAdornment={
            titleFocused ? (
              <span className="shrink-0 text-body-regular-14 text-gray-400">
                {t.titleCounter(form.title.length, TITLE_MAX_LENGTH)}
              </span>
            ) : null
          }
          className="shrink-0"
        />

        {/* 날짜 · 시간 */}
        <div className="flex shrink-0 items-center gap-3">
          <SelectField
            iconSrc="/icons/write/calendar-200.svg"
            selectedIconSrc="/icons/write/calendar-700.svg"
            placeholder={t.datePlaceholder}
            value={form.isDateUndecided ? t.dateUndecidedLabel : dateValue}
            active={datePickerOpen}
            onClick={() => setDatePickerOpen(true)}
          />
          <SelectField
            iconSrc="/icons/write/clock-200.svg"
            selectedIconSrc="/icons/write/clock-700.svg"
            placeholder={t.timePlaceholder}
            value={form.isTimeUndecided ? t.timeUndecidedLabel : timeValue}
            active={timePickerOpen}
            disabled={form.isDateUndecided}
            onClick={() => setTimePickerOpen(true)}
          />
        </div>

        {/* 장소 */}
        <SelectField
          iconSrc="/icons/write/location-200.svg"
          selectedIconSrc="/icons/write/location-700.svg"
          placeholder={t.addressPlaceholder}
          value={form.place?.label ?? null}
          active={locationPickerOpen}
          onClick={() => setLocationPickerOpen(true)}
          className="shrink-0"
        />

        {/* 내용 + 사진 첨부 */}
        <Textarea
          value={form.description}
          onChange={(event) => form.setDescription(event.target.value)}
          placeholder={t.descriptionPlaceholder}
          className="min-h-40 flex-1"
          bottomSlot={
            <MeetupImagePicker
              image={form.image?.preview ?? null}
              onPick={() => fileInputRef.current?.click()}
              onRemove={() => form.setImage(null)}
            />
          }
        />
      </div>

      {/* 제출 */}
      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        {error ? <Explanation variant="error" text={error} /> : null}
        <button
          type="button"
          disabled={!form.canSubmit || submitting}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            form.canSubmit && !submitting ? "bg-primary" : "bg-gray-200"
          )}
        >
          {submitting ? t.submittingButton : t.submitButton}
        </button>
      </div>

      {/* 숨긴 파일 입력 (OS 시트에서 사진 보관함/사진 찍기 선택) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <MeetupDatePicker
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        value={form.date}
        isDateUndecided={form.isDateUndecided}
        onConfirm={form.setDateSelection}
      />
      <MeetupTimePicker
        open={timePickerOpen}
        onOpenChange={setTimePickerOpen}
        value={form.time}
        isTimeUndecided={form.isTimeUndecided}
        onConfirm={form.setTimeSelection}
      />
      <MeetupLocationPicker
        open={locationPickerOpen}
        value={form.place?.label ?? null}
        currentPosition={currentPosition}
        onConfirm={form.setPlace}
        onClose={() => setLocationPickerOpen(false)}
      />
    </>
  )
}

export { CreateMeetupScreen }
