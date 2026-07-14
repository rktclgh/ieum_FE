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
import { daysInMonth, type MeetupDateValue } from "@/features/meetup/constants/create-meetup"
import { getKstDateKey } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"

/** 오늘부터 선택 가능한 연도 범위 (올해 포함 6개 연도) */
const YEAR_SPAN = 5

interface MeetupDatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MeetupDateValue | null
  onConfirm: (value: MeetupDateValue) => void
}

/** 년/월/일 3열 휠 피커 바텀시트. 확정 전까지는 draft 상태로만 굴리고 완료 시 onConfirm. */
function MeetupDatePicker({ open, onOpenChange, value, onConfirm }: MeetupDatePickerProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  const today = React.useMemo<MeetupDateValue>(() => {
    const [year, month, day] = getKstDateKey().split("-").map(Number)
    return { year, month, day }
  }, [])

  const [draftYear, setDraftYear] = React.useState(today.year)
  const [draftMonth, setDraftMonth] = React.useState(today.month)
  const [draftDay, setDraftDay] = React.useState(today.day)

  // 시트를 열 때마다 현재 값(없으면 오늘)으로 draft 초기화
  React.useEffect(() => {
    if (!open) return
    const base = value ?? today
    setDraftYear(base.year)
    setDraftMonth(base.month)
    setDraftDay(base.day)
  }, [open, value, today])

  const years = React.useMemo(
    () => Array.from({ length: YEAR_SPAN + 1 }, (_, index) => today.year + index),
    [today.year]
  )
  const months = React.useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), [])
  const maxDay = daysInMonth(draftYear, draftMonth)
  const days = React.useMemo(() => Array.from({ length: maxDay }, (_, index) => index + 1), [maxDay])

  // 월/연 변경으로 일수가 줄어드는 경우는 읽는 시점(value)·확정 시점에 clamp 하므로 별도 보정 effect 불필요
  const selectedDay = Math.min(draftDay, maxDay)

  const yearLabels = years.map((year) => t.yearLabel(year))
  const monthLabels = months.map((month) => t.monthLabel(month))
  const dayLabels = days.map((day) => t.dayLabel(day))

  const handleConfirm = () => {
    onConfirm({ year: draftYear, month: draftMonth, day: selectedDay })
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent className="gap-6 pb-2">
              <div className="relative flex w-full items-center justify-center gap-2 py-1">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-gray-50" />
                <WheelPicker
                  options={yearLabels}
                  value={t.yearLabel(draftYear)}
                  onChange={(label) => {
                    const index = yearLabels.indexOf(label)
                    if (index >= 0) setDraftYear(years[index])
                  }}
                  className="relative z-10 flex-1"
                />
                <WheelPicker
                  options={monthLabels}
                  value={t.monthLabel(draftMonth)}
                  onChange={(label) => {
                    const index = monthLabels.indexOf(label)
                    if (index >= 0) setDraftMonth(months[index])
                  }}
                  className="relative z-10 flex-1"
                />
                <WheelPicker
                  options={dayLabels}
                  value={t.dayLabel(selectedDay)}
                  onChange={(label) => {
                    const index = dayLabels.indexOf(label)
                    if (index >= 0) setDraftDay(days[index])
                  }}
                  className="relative z-10 flex-1"
                />
              </div>
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-full border border-primary-400 px-4 py-3 text-center text-body-medium-14 text-primary-400"
                >
                  {t.cancelButton}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-full bg-primary-400 px-4 py-3 text-center text-body-medium-14 text-white"
                >
                  {t.confirmButton}
                </button>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MeetupDatePicker }
