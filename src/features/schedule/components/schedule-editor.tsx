"use client"

import * as React from "react"
import Image from "next/image"

import { AppBar } from "@/components/ui/app-bar"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { Explanation } from "@/components/ui/text-field/explanation"
import { MeetupLocationPicker } from "@/features/meetup/components/meetup-location-picker"
import { MeetupSelectField } from "@/features/meetup/components/meetup-select-field"
import { MeetupTimePicker } from "@/features/meetup/components/meetup-time-picker"
import {
  formatDateValue,
  formatTimeValue,
  type MeetupPlaceValue,
  type MeetupTimeValue,
} from "@/features/meetup/constants/create-meetup"
import type { MeetingScheduleEntry } from "@/features/schedule/lib/schedule-adapter"
import {
  buildScheduleEditorRequest,
  isPastScheduleDate,
  type ScheduleEditorRequest,
} from "@/features/schedule/lib/schedule-editor"
import { getKstTimeParts } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type ScheduleEditorMode = "create" | "edit"

interface ScheduleEditorProps extends ScheduleEditorContentProps {
  open: boolean
}

/** 일정 생성·수정 풀스크린 오버레이. 폼 상태는 Content가 들고 있어 닫히면 함께 초기화된다. */
function ScheduleEditor({ open, ...props }: ScheduleEditorProps) {
  return (
    <FullScreenOverlay
      open={open}
      className="z-50 app-column flex flex-col bg-white"
    >
      <ScheduleEditorContent {...props} />
    </FullScreenOverlay>
  )
}

interface ScheduleEditorContentProps {
  mode: ScheduleEditorMode
  selectedDate: string
  todayDate: string
  schedule?: MeetingScheduleEntry
  isPending: boolean
  onClose: () => void
  onSubmit: (body: ScheduleEditorRequest) => void
}

function ScheduleEditorContent({
  mode,
  selectedDate,
  todayDate,
  schedule,
  isPending,
  onClose,
  onSubmit,
}: ScheduleEditorContentProps) {
  const { messages } = useTranslation()
  const t = messages.schedule
  const createT = messages.createMeetup
  const [title, setTitle] = React.useState(() => schedule?.title ?? "")
  const [time, setTime] = React.useState<MeetupTimeValue | null>(() =>
    schedule ? getKstTimeParts(schedule.startsAt) : null
  )
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(() => {
    if (!schedule?.locationLabel) return null
    // The schedule API deliberately omits map coordinates. They are used only by
    // the location picker; an unchanged saved name is sent back as display text.
    return { label: schedule.locationLabel, address: schedule.locationLabel, lat: 0, lng: 0 }
  })
  const [timePickerOpen, setTimePickerOpen] = React.useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const dateValue = React.useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number)
    return { year, month, day }
  }, [selectedDate])
  const timeValue = time
    ? formatTimeValue(time, time.period === "am" ? createT.amLabel : createT.pmLabel)
    : null
  const isPast = isPastScheduleDate(selectedDate, todayDate)

  const handleSubmit = () => {
    if (isPending) return
    if (isPast) {
      setFormError(t.pastDateError)
      return
    }

    const request = buildScheduleEditorRequest({ selectedDate, title, time, place })
    if (!request) {
      setFormError(t.editorRequired)
      return
    }

    setFormError(null)
    onSubmit(request)
  }

  return (
    <>
      <AppBar
        title={mode === "create" ? t.editorCreateTitle : t.editorEditTitle}
        trailingVariant="close"
        onLeadingClick={onClose}
        onTrailingClick={onClose}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
        <div className="flex h-[3.375rem] w-full items-center gap-1 rounded-xl border border-gray-100 p-4">
          <Image src="/icons/write/calendar-700.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
          <span className="text-body-regular-16 text-gray-900">{formatDateValue(dateValue)}</span>
          <span className="ml-auto text-body-regular-12 text-gray-400">{t.dateLabel}</span>
        </div>

        <div className="flex h-[3.375rem] w-full items-center gap-2 rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.titlePlaceholder}
            className="w-full min-w-0 bg-transparent text-body-regular-16 text-gray-900 caret-primary outline-none placeholder:text-gray-400"
          />
        </div>

        <MeetupSelectField
          iconSrc="/icons/write/clock-200.svg"
          selectedIconSrc="/icons/write/clock-700.svg"
          placeholder={t.timePlaceholder}
          value={timeValue}
          active={timePickerOpen}
          onClick={() => setTimePickerOpen(true)}
        />

        <MeetupSelectField
          iconSrc="/icons/write/location-200.svg"
          selectedIconSrc="/icons/write/location-700.svg"
          placeholder={t.locationPlaceholder}
          value={place?.label ?? place?.address ?? null}
          active={locationPickerOpen}
          onClick={() => setLocationPickerOpen(true)}
        />
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        {formError ? <Explanation variant="error" text={formError} className="px-1 pb-1" /> : null}
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            isPending ? "bg-gray-200" : "bg-primary"
          )}
        >
          {mode === "create" ? t.createAction : t.updateAction}
        </button>
      </div>

      <MeetupTimePicker
        open={timePickerOpen}
        onOpenChange={setTimePickerOpen}
        value={time}
        // 일정은 시각이 필수라 시간 미정 옵션을 열지 않는다. 확정값에는 항상 시각이 들어온다.
        onConfirm={({ time: nextTime }) => {
          if (nextTime) setTime(nextTime)
        }}
      />
      <MeetupLocationPicker
        open={locationPickerOpen}
        value={place?.label ?? place?.address ?? null}
        onConfirm={setPlace}
        onClose={() => setLocationPickerOpen(false)}
      />
    </>
  )
}

export { ScheduleEditor }
export type { ScheduleEditorMode }
