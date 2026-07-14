"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { Explanation } from "@/components/ui/text-field/explanation"
import { uploadMeetingImage } from "@/features/meetup/api/meetup-file-api"
import {
  DEFAULT_MAX_MEMBERS,
  TITLE_MAX_LENGTH,
  formatDateValue,
  formatTimeValue,
  toKstIso,
} from "@/features/meetup/constants/create-meetup"
import { MeetupDatePicker } from "@/features/meetup/components/meetup-date-picker"
import { MeetupImagePicker } from "@/features/meetup/components/meetup-image-picker"
import { MeetupLocationPicker } from "@/features/meetup/components/meetup-location-picker"
import { MeetupSelectField } from "@/features/meetup/components/meetup-select-field"
import { MeetupTimePicker } from "@/features/meetup/components/meetup-time-picker"
import { useCreateMeetupForm } from "@/features/meetup/hooks/use-create-meetup-form"
import { useCreateMeeting } from "@/features/meetup/hooks/use-meetup-mutations"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface CreateMeetupScreenProps {
  /** 닫기(X) 또는 제출 완료 시 호출 — 오버레이 언마운트는 부모가 담당 */
  onClose: () => void
}

/**
 * 새 모임 작성 풀스크린 오버레이. 지도 홈 FAB의 "모임 만들기"에서 열린다.
 * 제목·날짜·시간·장소·내용을 채우면 제출 버튼이 활성화되고, 제출 시 POST /meetings 로 생성한다.
 * 장소는 Figma 지도 기반 MeetupLocationPicker에서 좌표(lat/lng)·주소·라벨까지 확보한다.
 */
function CreateMeetupScreen({ onClose }: CreateMeetupScreenProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup
  const form = useCreateMeetupForm()
  const createMeeting = useCreateMeeting()

  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [timePickerOpen, setTimePickerOpen] = React.useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false)
  const [titleFocused, setTitleFocused] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)

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
    if (!form.date || !form.time || !form.place) return
    setError(null)

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
        schedule: { startsAt: toKstIso(form.date, form.time) },
        maxMembers: DEFAULT_MAX_MEMBERS,
        imageFileId,
      })
      onClose()
    } catch (err) {
      setError(getMeetupErrorMessage(err, messages))
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-sm flex-col bg-white">
      <AppBar
        title={t.appBarTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
        className="shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
        {/* 제목 — 15자(공백 포함)까지만 입력 가능, 포커스 시 카운터 표시 */}
        <div className="shrink-0">
          <div className="flex h-[3.375rem] w-full items-center gap-2 rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600">
            <input
              value={form.title}
              // maxLength만으로는 한글(IME) 조합 중 16번째 글자가 새어 들어가므로 상태에서 직접 자름
              onChange={(event) => form.setTitle(event.target.value.slice(0, TITLE_MAX_LENGTH))}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              maxLength={TITLE_MAX_LENGTH}
              placeholder={t.titlePlaceholder}
              className="w-full min-w-0 bg-transparent text-body-regular-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
            />
            {titleFocused ? (
              <span className="shrink-0 text-body-regular-14 text-gray-400">
                {t.titleCounter(form.title.length, TITLE_MAX_LENGTH)}
              </span>
            ) : null}
          </div>
        </div>

        {/* 날짜 · 시간 */}
        <div className="flex shrink-0 items-center gap-3">
          <MeetupSelectField
            iconSrc="/icons/write/calendar-200.svg"
            selectedIconSrc="/icons/write/calendar-700.svg"
            placeholder={t.datePlaceholder}
            value={dateValue}
            active={datePickerOpen}
            onClick={() => setDatePickerOpen(true)}
          />
          <MeetupSelectField
            iconSrc="/icons/write/clock-200.svg"
            selectedIconSrc="/icons/write/clock-700.svg"
            placeholder={t.timePlaceholder}
            value={timeValue}
            active={timePickerOpen}
            onClick={() => setTimePickerOpen(true)}
          />
        </div>

        {/* 장소 */}
        <MeetupSelectField
          iconSrc="/icons/write/location-200.svg"
          selectedIconSrc="/icons/write/location-700.svg"
          placeholder={t.addressPlaceholder}
          value={form.place?.label ?? null}
          active={locationPickerOpen}
          onClick={() => setLocationPickerOpen(true)}
          className="shrink-0"
        />

        {/* 내용 + 사진 첨부 */}
        <div className="relative min-h-40 flex-1 rounded-lg border border-gray-100 transition-colors focus-within:border-primary-600">
          <textarea
            value={form.description}
            onChange={(event) => form.setDescription(event.target.value)}
            placeholder={t.descriptionPlaceholder}
            className="size-full resize-none bg-transparent px-[15px] pt-[11px] pb-24 text-body-regular-14 text-gray-900 caret-primary-600 outline-none placeholder:text-gray-400"
          />
          <MeetupImagePicker
            image={form.image?.preview ?? null}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onChooseAlbum={() => albumInputRef.current?.click()}
            onRemove={() => form.setImage(null)}
            className="absolute bottom-[15px] left-[15px]"
          />
        </div>
      </div>

      {/* 제출 */}
      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        {error ? <Explanation variant="error" text={error} className="px-1 pb-1" /> : null}
        <button
          type="button"
          disabled={!form.canSubmit || submitting}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            form.canSubmit && !submitting ? "bg-primary-600" : "bg-gray-200"
          )}
        >
          {submitting ? t.submittingButton : t.submitButton}
        </button>
      </div>

      {/* 숨긴 파일 입력 (사진 찍기 / 앨범에서 고르기) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <MeetupDatePicker
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        value={form.date}
        onConfirm={form.setDate}
      />
      <MeetupTimePicker
        open={timePickerOpen}
        onOpenChange={setTimePickerOpen}
        value={form.time}
        onConfirm={form.setTime}
      />
      {locationPickerOpen ? (
        <MeetupLocationPicker
          value={form.place?.label ?? null}
          onConfirm={form.setPlace}
          onClose={() => setLocationPickerOpen(false)}
        />
      ) : null}
    </div>
  )
}

export { CreateMeetupScreen }
