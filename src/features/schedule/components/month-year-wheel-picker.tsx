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

function MonthYearWheelPicker({ open, onOpenChange, year, month, onConfirm }: MonthYearWheelPickerProps) {
  const { messages } = useTranslation()

  const yearLabels = React.useMemo(
    () => Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, index) => `${year - YEAR_RANGE + index}년`),
    [year]
  )

  const [draftYear, setDraftYear] = React.useState(`${year}년`)
  const [draftMonth, setDraftMonth] = React.useState(MONTH_LABELS[month - 1])

  React.useEffect(() => {
    if (!open) return
    setDraftYear(`${year}년`)
    setDraftMonth(MONTH_LABELS[month - 1])
  }, [open, year, month])

  const handleConfirm = () => {
    onConfirm(Number(draftYear.replace("년", "")), MONTH_LABELS.indexOf(draftMonth) + 1)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent className="gap-6 pb-2">
              <div className="relative flex w-full items-center justify-center gap-4 py-1">
                <div className="pointer-events-none absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-gray-50" />
                <WheelPicker options={yearLabels} value={draftYear} onChange={setDraftYear} className="w-28" />
                <WheelPicker options={MONTH_LABELS} value={draftMonth} onChange={setDraftMonth} className="w-16" />
              </div>
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-full border border-primary-600 px-4 py-3 text-center text-body-medium-14 text-primary-600"
                >
                  {messages.chat.cancelButton}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-full bg-primary-600 px-4 py-3 text-center text-body-medium-14 text-white"
                >
                  {messages.schedule.confirmButton}
                </button>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MonthYearWheelPicker }
