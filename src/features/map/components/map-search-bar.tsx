"use client"

import { Icon } from "@/components/ui/icon"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MapSearchBarProps {
  /** 검색바를 탭하면 검색 오버레이를 연다. 실제 검색 입력은 오버레이가 담당한다. */
  onOpenSearch: () => void
  selectedLocationLabel?: string | null
  onClearSelectedLocation?: () => void
  className?: string
}

function MapSearchBar({
  onOpenSearch,
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
              <Icon name="common/clear" width={8} height={8} className="size-2" />
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? "relative flex-1"}>
      {/* input이 아닌 button: readOnly input을 쓰면 iOS Safari가 그래도 키보드를 띄우고
          페이지를 스크롤시켜 화면이 밀린다. 타이핑은 오버레이 입력에서 한다. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-[45px] w-full items-center gap-3 rounded-full bg-white px-4 py-3 text-left shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50"
      >
        <Icon name="search-bar/search" width={20} height={20} className="size-5 shrink-0" />
        <span className="truncate text-body-regular-15 text-gray-400">
          {messages.home.searchPlaceholder}
        </span>
      </button>
    </div>
  )
}

export { MapSearchBar }
