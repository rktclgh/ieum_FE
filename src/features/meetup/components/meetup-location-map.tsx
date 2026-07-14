"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import Image from "next/image"

import { AppBar } from "@/components/ui/app-bar"
import type { Place } from "@/features/map/api/place-search-api"
import { DEFAULT_MAP_ZOOM } from "@/features/map/constants/map"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import { LocationListItem } from "@/features/meetup/components/location-list-item"
import { FAB_BOTTOM_FLOOR } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"

const MapCanvas = dynamic(
  () => import("@/features/map/components/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-gray-100" /> }
)

interface MeetupLocationMapProps {
  /** 내 위치 (상위에서 관리) */
  position: Coordinates | null
  onBack: () => void
  /** 검색바 탭 → 검색 화면 전환 */
  onOpenSearch: () => void
  /** "이 주소에 대한 장소명 입력하기" → 직접 입력 화면 (역지오코딩된 주소 + 좌표 전달) */
  onCreateName: (address: string, coords: Coordinates) => void
  /** 목록에서 장소를 고르면 그 장소(좌표 포함)를 확정한다 */
  onSelectPlace: (place: Place) => void
}

/**
 * 장소 선택 - 지도 화면. 지도에서 지점을 클릭하면 Figma 핀을 찍고 그 지점을 역지오코딩하며,
 * 내 위치는 항상 표시된다. GPS 버튼으로 내 위치로 재중심. 클릭 전에는 내 위치를 기준으로 안내한다.
 */
function MeetupLocationMap({
  position,
  onBack,
  onOpenSearch,
  onCreateName,
  onSelectPlace,
}: MeetupLocationMapProps) {
  const { messages } = useTranslation()
  const t = messages.selectLocation

  // clicked: 지도에서 직접 고른 지점(Figma 핀 표시). 없으면 내 위치를 기준으로 역지오코딩한다.
  const [clicked, setClicked] = React.useState<Coordinates | null>(null)
  // 지도 뷰 이동은 recenterKey(nonce)로만 구동한다. position은 실시간 갱신되어도 뷰를 움직이지 않는다.
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const recenterTo = React.useCallback((target: Coordinates) => {
    setRecenterTarget(target)
    setRecenterKey((key) => key + 1)
  }, [])

  // 최초 위치 확보 1회: 내 위치로 자동 중심 이동.
  const hasCenteredRef = React.useRef(false)
  React.useEffect(() => {
    if (hasCenteredRef.current || !position) return
    hasCenteredRef.current = true
    recenterTo(position)
  }, [position, recenterTo])

  // 역지오코딩·주변 검색 기준점: 지도에서 고른 지점 우선, 없으면 내 위치.
  const target = clicked ?? position

  // GPS 버튼: 내 위치를 drawer/헤더 제외한 보이는 영역 정중앙으로.
  const handleGps = () => {
    if (position) recenterTo(position)
  }

  const { data: reverseGeocoded } = useReverseGeocode(target)
  const currentAddress = reverseGeocoded?.fullAddress ?? reverseGeocoded?.shortLabel ?? null

  // 전용 "주변 장소" 엔드포인트가 없어, 역지오코딩된 지역명으로 검색해 근사한다. (백엔드 확정 시 교체 — #47)
  const { data: nearbyPlaces } = usePlaceSearch(reverseGeocoded?.shortLabel ?? "", target)

  // 헤더·하단 시트가 지도를 가리는 높이를 재서, GPS 재중심 시 "보이는 영역" 정중앙에 오도록 인셋으로 넘긴다.
  const headerRef = React.useRef<HTMLDivElement>(null)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const [topInset, setTopInset] = React.useState(0)
  const [bottomInset, setBottomInset] = React.useState(0)

  React.useEffect(() => {
    const header = headerRef.current
    const sheet = sheetRef.current
    if (!header || !sheet) return
    const observer = new ResizeObserver(() => {
      setTopInset(header.offsetHeight)
      setBottomInset(sheet.offsetHeight)
    })
    observer.observe(header)
    observer.observe(sheet)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-white">
      <MapCanvas
        center={recenterTarget}
        recenterKey={recenterKey}
        centerZoom={DEFAULT_MAP_ZOOM}
        animateCenter
        topInset={topInset}
        bottomInset={bottomInset}
        className="absolute inset-0 z-0 size-full"
        onMapClick={setClicked}
        livePosition={position}
        selectedPosition={clicked}
      />

      {/* 전경 레이아웃 — 컨테이너 자체는 클릭 통과(pointer-events-none)로 지도 클릭을 살리고,
          상호작용이 필요한 헤더·GPS·시트에만 pointer-events-auto를 준다. */}
      <div className="pointer-events-none relative z-20 flex size-full flex-col">
        {/* 상단: 앱바 + 검색바 */}
        <div ref={headerRef} className="pointer-events-auto shrink-0 bg-white">
          <AppBar
            title={t.title}
            leadingIcon={undefined}
            trailingIcon={null}
            onLeadingClick={onBack}
          />
          <div className="flex justify-center px-4 pb-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex h-[46px] w-full items-center gap-3 rounded-full bg-gray-50 px-4 py-3 text-left"
            >
              <Image
                src="/icons/search-bar/search.svg"
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0"
              />
              <span className="text-body-regular-15 text-gray-400">{t.searchPlaceholder}</span>
            </button>
          </div>
        </div>

        {/* 지도 위 스페이서 — 클릭이 지도로 통과, GPS 버튼만 클릭 가능 */}
        <div className="relative flex-1">
          <button
            type="button"
            aria-label={t.currentLocationLabel}
            onClick={handleGps}
            className={`pointer-events-auto absolute ${FAB_BOTTOM_FLOOR} right-4 flex size-[46px] items-center justify-center rounded-full bg-white shadow-[0px_2px_2px_0px_rgba(0,0,0,0.1)]`}
          >
            <Image src="/icons/circle/location.svg" alt="" width={24} height={24} className="size-6" />
          </button>
        </div>

        {/* 하단 시트 — 바깥은 둥근 모서리로 클립(스크롤바가 drawer 밖으로 나가지 않게),
            안쪽만 스크롤. 직접입력 진입 행 + 주변 장소가 함께 스크롤된다. */}
        <div
          ref={sheetRef}
          className="pointer-events-auto shrink-0 overflow-hidden rounded-t-2xl bg-white shadow-[0px_-2px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <div className="flex max-h-72 flex-col gap-4 overflow-y-auto px-4 pt-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <LocationListItem
              iconSrc="/icons/write/location-plus.svg"
              title={t.createPlaceTitle}
              subtitle={currentAddress ?? t.loadingAddress}
              actionLabel={t.createPlaceButton}
              actionVariant="outlined"
              onAction={() => currentAddress && target && onCreateName(currentAddress, target)}
            />

            {nearbyPlaces?.map((place) => (
              <LocationListItem
                key={place.id}
                iconSrc="/icons/write/location-list.svg"
                title={place.name}
                subtitle={place.address}
                actionLabel={t.selectButton}
                onAction={() => onSelectPlace(place)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MeetupLocationMap }
