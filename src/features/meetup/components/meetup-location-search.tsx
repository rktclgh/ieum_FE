"use client"

import * as React from "react"
import Image from "next/image"

import { AppBar } from "@/components/ui/app-bar"
import { HighlightedText } from "@/components/ui/highlighted-text"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { LocationListItem } from "@/features/meetup/components/location-list-item"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupLocationSearchProps {
  /** 검색 기준 좌표 (내 위치) */
  near: Coordinates | null
  /** 초기 검색어 (지도 화면 검색바에서 넘어올 때) */
  initialQuery?: string
  onBack: () => void
  /** 장소를 선택하면 그 장소명을 확정한다 */
  onSelectPlace: (name: string) => void
}

/**
 * 장소 선택 - 검색 결과 화면. 입력한 검색어와 일치하는 부분을 강조 표시한다.
 * 검색 자체는 매 입력마다 즉시 반영(IME 가드 없음)한다.
 */
function MeetupLocationSearch({
  near,
  initialQuery = "",
  onBack,
  onSelectPlace,
}: MeetupLocationSearchProps) {
  const { messages } = useTranslation()
  const t = messages.selectLocation
  const [query, setQuery] = React.useState(initialQuery)

  const { data: places } = usePlaceSearch(query, near)
  const trimmed = query.trim()

  return (
    <div className="flex size-full flex-col bg-white">
      <AppBar
        title={t.title}
        leadingIcon={undefined}
        trailingIcon={null}
        onLeadingClick={onBack}
        className="shrink-0"
      />

      {/* 검색 입력 (아이콘 · 텍스트 · 지우기) */}
      <div className="flex justify-center px-4 pb-2">
        <div className="flex h-[46px] w-full items-center justify-between gap-3 rounded-full bg-gray-50 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Image
              src="/icons/search-bar/search.svg"
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full min-w-0 bg-transparent text-body-medium-15 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-15 placeholder:text-gray-400"
            />
          </div>
          {query.length > 0 && (
            <button
              type="button"
              aria-label={t.clearLabel}
              onClick={() => setQuery("")}
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-400"
            >
              <Image src="/icons/common/clear.svg" alt="" width={8} height={8} className="size-2" />
            </button>
          )}
        </div>
      </div>

      {/* 결과 리스트 */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-t-2xl px-4 pt-6 pb-3">
        {places?.map((place: Place) => (
          <LocationListItem
            key={place.id}
            iconSrc="/icons/schedule/map-pin.svg"
            title={<HighlightedText text={place.name} query={trimmed} />}
            subtitle={place.address}
            actionLabel={t.selectButton}
            onAction={() => onSelectPlace(place.name)}
          />
        ))}

        {trimmed.length > 0 && places && places.length === 0 && (
          <p className="pt-6 text-center text-body-regular-14 text-gray-400">{t.searchEmpty}</p>
        )}
      </div>
    </div>
  )
}

export { MeetupLocationSearch }
