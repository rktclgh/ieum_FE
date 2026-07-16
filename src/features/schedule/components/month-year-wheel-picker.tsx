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
import { useTranslation } from "@/lib/i18n/use-translation"

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`)
const YEAR_RANGE = 10

interface MonthYearWheelPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  onConfirm: (year: number, month: number) => void
}

interface MonthYearWheelPickerContentProps {
  year: number
  month: number
  onCancel: () => void
  onConfirm: (year: number, month: number) => void
}

function MonthYearWheelPickerContent({
  year,
  month,
  onCancel,
  onConfirm,
}: MonthYearWheelPickerContentProps) {
  const { messages } = useTranslation()

  const yearLabels = React.useMemo(
    () => Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, index) => `${year - YEAR_RANGE + index}년`),
    [year]
  )

  const [draftYear, setDraftYear] = React.useState(`${year}년`)
  const [draftMonth, setDraftMonth] = React.useState(MONTH_LABELS[month - 1])

  const handleConfirm = () => {
    onConfirm(Number(draftYear.replace("년", "")), MONTH_LABELS.indexOf(draftMonth) + 1)
  }

  return (
    <DrawerContent className="gap-6 pb-2">
      <div className="relative flex w-full items-center justify-center gap-4 py-1">
        <div className="pointer-events-none absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-gray-50" />
        <WheelPicker
          options={yearLabels}
          value={draftYear}
          onChange={setDraftYear}
          className="relative z-10 w-28"
        />
        <WheelPicker
          options={MONTH_LABELS}
          value={draftMonth}
          onChange={setDraftMonth}
          className="relative z-10 w-16"
        />
      </div>
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-primary px-4 py-3 text-center text-body-medium-14 text-primary"
        >
          {messages.chat.cancelButton}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-body-medium-14 text-white"
        >
          {messages.schedule.confirmButton}
        </button>
      </div>
    </DrawerContent>
  )
}

function MonthYearWheelPicker({ open, onOpenChange, year, month, onConfirm }: MonthYearWheelPickerProps) {
  const handleConfirm = (nextYear: number, nextMonth: number) => {
    onConfirm(nextYear, nextMonth)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <MonthYearWheelPickerContent
              key={open ? `${year}-${month}` : "closed"}
              year={year}
              month={month}
              onCancel={() => onOpenChange(false)}
              onConfirm={handleConfirm}
            />
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MonthYearWheelPicker }
