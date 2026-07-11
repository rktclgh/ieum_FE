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
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupAddressPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string | null
  onConfirm: (value: string) => void
}

/**
 * 주소 입력 바텀시트 (임시).
 * 최종적으로는 지도 기반 장소 선택(#31·#47)으로 대체될 예정이라, 지금은 프레젠테이션 흐름을
 * 막지 않도록 단순 텍스트 입력만 제공한다.
 */
function MeetupAddressPicker({ open, onOpenChange, value, onConfirm }: MeetupAddressPickerProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  const [draft, setDraft] = React.useState(value ?? "")

  React.useEffect(() => {
    if (open) setDraft(value ?? "")
  }, [open, value])

  const handleConfirm = () => {
    const trimmed = draft.trim()
    if (trimmed.length > 0) onConfirm(trimmed)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent className="gap-4 pb-2">
              <div className="flex h-[3.375rem] w-full items-center gap-2 rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600">
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleConfirm()
                  }}
                  placeholder={t.addressPlaceholder}
                  className="w-full bg-transparent text-body-medium-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
                />
              </div>
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
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
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MeetupAddressPicker }
