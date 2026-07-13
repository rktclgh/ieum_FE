"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MeetupLocationNameProps {
  /** 상단에 표기할 (역지오코딩된) 주소 */
  address: string
  initialValue?: string
  onBack: () => void
  /** 완료 시 입력한 장소명을 확정한다 */
  onDone: (name: string) => void
}

/**
 * 장소 선택 - 직접 입력 화면. 지도에서 찍은 주소에 사용자가 직접 장소명을 붙인다.
 * 장소명을 한 글자라도 입력해야 완료 버튼이 활성화된다.
 */
function MeetupLocationName({ address, initialValue = "", onBack, onDone }: MeetupLocationNameProps) {
  const { messages } = useTranslation()
  const t = messages.selectLocation
  const [name, setName] = React.useState(initialValue)

  const canSubmit = name.trim().length > 0

  const handleDone = () => {
    if (!canSubmit) return
    onDone(name.trim())
  }

  return (
    <div className="flex size-full flex-col bg-white">
      <AppBar
        title={t.nameTitle}
        leadingIcon={undefined}
        trailingIcon={null}
        onLeadingClick={onBack}
        className="shrink-0"
      />

      <div className="flex flex-1 flex-col gap-3 px-4 pt-3">
        <div className="flex w-full flex-col items-start">
          <p className="px-2 py-1 text-body-medium-14 text-gray-900">{address}</p>
          <div className="flex h-[3.375rem] w-full items-center rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleDone()
              }}
              placeholder={t.namePlaceholder}
              className="w-full bg-transparent text-body-regular-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleDone}
          className={cn(
            "h-12 w-full rounded-full text-body-medium-14 text-white transition-colors",
            canSubmit ? "bg-primary-600" : "bg-gray-200"
          )}
        >
          {t.doneButton}
        </button>
      </div>
    </div>
  )
}

export { MeetupLocationName }
