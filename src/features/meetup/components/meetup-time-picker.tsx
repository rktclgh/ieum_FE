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
import type { MeetupTimeValue } from "@/features/meetup/constants/create-meetup"
import { getKstTimeParts } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"

const PERIODS = ["am", "pm"] as const
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = Array.from({ length: 60 }, (_, index) => index)

interface MeetupTimePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MeetupTimeValue | null
  onConfirm: (value: MeetupTimeValue) => void
}

interface MeetupTimePickerContentProps {
  initialValue: MeetupTimeValue | null
  onCancel: () => void
  onConfirm: (value: MeetupTimeValue) => void
}

function MeetupTimePickerContent({
  initialValue,
  onCancel,
  onConfirm,
}: MeetupTimePickerContentProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  const [draft, setDraft] = React.useState<MeetupTimeValue>(
    () => initialValue ?? getKstTimeParts()
  )

  const periodLabels = PERIODS.map((period) => (period === "am" ? t.amLabel : t.pmLabel))
  const hourLabels = HOURS.map((hour) => t.hourLabel(hour))
  const minuteLabels = MINUTES.map((minute) => t.minuteLabel(String(minute).padStart(2, "0")))

  const handleConfirm = () => {
    onConfirm(draft)
  }

  return (
    <DrawerContent className="gap-6 pb-2">
      <div className="relative flex w-full items-center justify-center gap-2 py-1">
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
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-primary-600 px-4 py-3 text-center text-body-medium-14 text-primary-600"
        >
          {t.cancelButton}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-primary-600 px-4 py-3 text-center text-body-medium-14 text-white"
        >
          {t.confirmButton}
        </button>
      </div>
    </DrawerContent>
  )
}

/** 오전·오후 / 시 / 분 3열 휠 피커 바텀시트. */
function MeetupTimePicker({ open, onOpenChange, value, onConfirm }: MeetupTimePickerProps) {
  const contentKey = !open
    ? "closed"
    : value
      ? `${value.period}-${value.hour}-${value.minute}`
      : "open-empty"

  const handleConfirm = (nextValue: MeetupTimeValue) => {
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
