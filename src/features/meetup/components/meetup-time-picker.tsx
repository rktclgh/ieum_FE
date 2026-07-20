"use client"

import * as React from "react"

import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport,
} from "@/components/ui/drawer"
import { WheelPicker } from "@/components/ui/wheel-picker"
import type { MeetupTimeSelection, MeetupTimeValue } from "@/features/meetup/constants/create-meetup"
import { getKstTimeParts } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const PERIODS = ["am", "pm"] as const
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTE_STEP = 5
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP)

/** 초기 분을 5분 단위 옵션에 맞도록 가장 가까운 값으로 보정한다. */
function snapMinute(minute: number): number {
  return Math.min(55, Math.round(minute / MINUTE_STEP) * MINUTE_STEP)
}

interface MeetupTimePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MeetupTimeValue | null
  /** 생략하면 시간 미정 옵션을 노출하지 않는다. 시각이 필수인 화면(일정 편집)이 그대로 쓴다. */
  isTimeUndecided?: boolean
  onConfirm: (value: MeetupTimeSelection) => void
}

interface MeetupTimePickerContentProps {
  initialValue: MeetupTimeValue | null
  initialIsTimeUndecided: boolean
  allowTimeUndecided: boolean
  onCancel: () => void
  onConfirm: (value: MeetupTimeSelection) => void
}

function MeetupTimePickerContent({
  initialValue,
  initialIsTimeUndecided,
  allowTimeUndecided,
  onCancel,
  onConfirm,
}: MeetupTimePickerContentProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  const [draft, setDraft] = React.useState<MeetupTimeValue>(() => {
    const source = initialValue ?? getKstTimeParts()
    return { ...source, minute: snapMinute(source.minute) }
  })
  const [isTimeUndecided, setIsTimeUndecided] = React.useState(initialIsTimeUndecided)

  const periodLabels = PERIODS.map((period) => (period === "am" ? t.amLabel : t.pmLabel))
  const hourLabels = HOURS.map((hour) => t.hourLabel(hour))
  const minuteLabels = MINUTES.map((minute) => t.minuteLabel(String(minute).padStart(2, "0")))

  const handleConfirm = () => {
    if (isTimeUndecided) {
      onConfirm({ time: null, isTimeUndecided: true })
      return
    }

    onConfirm({ time: draft, isTimeUndecided: false })
  }

  return (
    <DrawerContent className="gap-6 pb-2">
      <div
        inert={isTimeUndecided}
        className={cn(
          "relative flex w-full items-center justify-center gap-2 py-1",
          isTimeUndecided && "pointer-events-none opacity-40"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-gray-50" />
        <WheelPicker
          options={periodLabels}
          value={draft.period === "am" ? t.amLabel : t.pmLabel}
          onChange={(label) => {
            const index = periodLabels.indexOf(label)
            if (index >= 0) setDraft((prev) => ({ ...prev, period: PERIODS[index] }))
          }}
          className="relative z-10 flex-1"
        />
        <WheelPicker
          options={hourLabels}
          value={t.hourLabel(draft.hour)}
          onChange={(label) => {
            const index = hourLabels.indexOf(label)
            if (index >= 0) setDraft((prev) => ({ ...prev, hour: HOURS[index] }))
          }}
          className="relative z-10 flex-1"
        />
        <WheelPicker
          options={minuteLabels}
          value={t.minuteLabel(String(draft.minute).padStart(2, "0"))}
          onChange={(label) => {
            const index = minuteLabels.indexOf(label)
            if (index >= 0) setDraft((prev) => ({ ...prev, minute: MINUTES[index] }))
          }}
          className="relative z-10 flex-1"
        />
      </div>
      {allowTimeUndecided ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={isTimeUndecided}
          onClick={() => setIsTimeUndecided((current) => !current)}
          className="flex w-full items-center gap-2 rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border-[1.5px]",
              isTimeUndecided ? "border-primary" : "border-gray-200"
            )}
          >
            {isTimeUndecided ? <span className="size-2.5 rounded-full bg-primary" /> : null}
          </span>
          <span className="text-body-regular-14 text-gray-700">{t.timeUndecidedLabel}</span>
        </button>
      ) : null}
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-primary px-4 py-3 text-center text-body-medium-14 text-primary"
        >
          {t.cancelButton}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-body-medium-14 text-white"
        >
          {t.confirmButton}
        </button>
      </div>
    </DrawerContent>
  )
}

/** 오전·오후 / 시 / 분 3열 휠 피커 바텀시트. */
function MeetupTimePicker({
  open,
  onOpenChange,
  value,
  isTimeUndecided,
  onConfirm,
}: MeetupTimePickerProps) {
  const allowTimeUndecided = isTimeUndecided !== undefined
  const contentKey = !open
    ? "closed"
    : isTimeUndecided
      ? "open-undecided"
      : value
        ? `${value.period}-${value.hour}-${value.minute}`
        : "open-empty"

  const handleConfirm = (nextValue: MeetupTimeSelection) => {
    onConfirm(nextValue)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <MeetupTimePickerContent
              key={contentKey}
              initialValue={value}
              initialIsTimeUndecided={isTimeUndecided ?? false}
              allowTimeUndecided={allowTimeUndecided}
              onCancel={() => onOpenChange(false)}
              onConfirm={handleConfirm}
            />
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MeetupTimePicker }
