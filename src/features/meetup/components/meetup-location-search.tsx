"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { SearchBox } from "@/components/ui/search-box"
import type { Place } from "@/features/map/api/place-search-api"
import type { GeocodedAddress } from "@/features/map/api/geocode-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeocode } from "@/features/map/hooks/use-geocode"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { LocationListItem } from "@/features/meetup/components/location-list-item"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupLocationSearchProps {
  /** 검색 기준 좌표 (내 위치) */
  near: Coordinates | null
  /** 초기 검색어 (지도 화면 검색바에서 넘어올 때) */
  initialQuery?: string
  onBack: () => void
  /** 상호(키워드) 결과를 고르면 그 장소(좌표 포함)를 확정한다 */
  onSelectPlace: (place: Place) => void
  /** 도로명/지번 주소 결과를 고르면 그 주소 + 좌표로 직접입력 화면으로 넘어간다 */
  onCreateName: (address: string, coords: Coordinates) => void
}

/**
 * 장소 선택 - 검색 결과 화면. 상호 검색(지역검색)과 도로명/지번 주소 검색(지오코딩)을 함께 조회한다.
 * "설빙 명동2호점"은 상호 결과로 바로 선택되고, "천호대로 808" 같은 주소는 지오코딩 결과로 잡혀
 * 장소명 입력 화면으로 이어진다. 입력마다 즉시 반영하되 네트워크 호출만 300ms 디바운스한다.
 */
function MeetupLocationSearch({
  near,
  initialQuery = "",
  onBack,
  onSelectPlace,
  onCreateName,
}: MeetupLocationSearchProps) {
  const { messages } = useTranslation()
  const t = messages.selectLocation
  const [query, setQuery] = React.useState(initialQuery)
  const [apiQuery, setApiQuery] = React.useState(initialQuery.trim())

  // 상호·주소 두 엔드포인트를 함께 치므로 키 입력마다 쏘지 않도록 조회 값만 디바운스한다.
  React.useEffect(() => {
    const timer = setTimeout(() => setApiQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: places } = usePlaceSearch(apiQuery, near)
  const { data: addresses } = useGeocode(apiQuery)

  const hasResults = (places?.length ?? 0) > 0 || (addresses?.length ?? 0) > 0
  const showEmpty = apiQuery.length > 0 && places && addresses && !hasResults

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
        <SearchBox
          tone="flat"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
        />
      </div>

      {/* 결과 리스트 — 상호(선택) + 도로명/지번 주소(입력) */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-t-2xl px-4 pt-6 pb-3">
        {places?.map((place: Place) => (
          <LocationListItem
            key={`place-${place.id}`}
            iconSrc="/icons/write/location-list.svg"
            title={<HighlightedText text={place.name} query={apiQuery} />}
            subtitle={place.address}
            actionLabel={t.selectButton}
            onAction={() => onSelectPlace(place)}
          />
        ))}

        {addresses?.map((address: GeocodedAddress, index: number) => {
          const primary = address.roadAddress || address.jibunAddress
          const secondary = address.roadAddress ? address.jibunAddress : ""
          return (
            <LocationListItem
              key={`addr-${primary}-${index}`}
              iconSrc="/icons/write/location-plus.svg"
              title={<HighlightedText text={primary} query={apiQuery} />}
              subtitle={secondary}
              actionLabel={t.createPlaceButton}
              actionVariant="filled"
              onAction={() => onCreateName(primary, { lat: address.lat, lng: address.lng })}
            />
          )
        })}

        {showEmpty && (
          <p className="pt-6 text-center text-body-regular-14 text-gray-400">{t.searchEmpty}</p>
        )}
      </div>
    </div>
  )
}

export { MeetupLocationSearch }
