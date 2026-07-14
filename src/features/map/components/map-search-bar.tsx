"use client"

import Image from "next/image"

import { SearchBox } from "@/components/ui/search-box"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MapSearchBarProps {
  /** 검색바 포커스 시 검색 오버레이를 연다. 실제 검색 입력은 오버레이가 담당한다. */
  onFocus: () => void
  selectedLocationLabel?: string | null
  onClearSelectedLocation?: () => void
  className?: string
}

function MapSearchBar({
  onFocus,
  selectedLocationLabel,
  onClearSelectedLocation,
  className,
}: MapSearchBarProps) {
  const { messages } = useTranslation()

  if (selectedLocationLabel) {
    return (
      <div className={className ?? "relative flex-1"}>
        <div className="flex h-[45px] w-full items-center justify-between gap-3 rounded-full bg-gray-50 px-4 py-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50">
          <span className="truncate text-body-medium-15 text-gray-900">
            {messages.home.selectedLocationPrefix}: {selectedLocationLabel}
          </span>
          {onClearSelectedLocation ? (
            <button
              type="button"
              aria-label={messages.home.clearSelectedLocationLabel}
              onClick={onClearSelectedLocation}
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200"
            >
              <Image src="/icons/common/clear.svg" alt="" width={8} height={8} className="size-2" />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? "relative flex-1"}>
      {/* readOnly: 포커스만으로 오버레이를 열고, 타이핑은 오버레이 입력에서 한다. */}
      <SearchBox readOnly placeholder={messages.home.searchPlaceholder} onFocus={onFocus} />
    </div>
  )
}

export { MapSearchBar }
