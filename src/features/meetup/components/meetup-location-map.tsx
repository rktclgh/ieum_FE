"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import Image from "next/image"

import { AppBar } from "@/components/ui/app-bar"
import { CrossfadeIcon } from "@/components/ui/crossfade-icon"
import type { Place } from "@/features/map/api/place-search-api"
import { MapCenterPin } from "@/features/map/components/map-center-pin"
import { MapLoadingSkeleton } from "@/features/map/components/map-loading-skeleton"
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/features/map/constants/map"
import type { Coordinates, GeolocationStatus } from "@/features/map/hooks/use-geolocation"
import { isSameCoordinate } from "@/features/map/lib/coordinate-precision"
import { resolveInitialMapCenter } from "@/features/map/lib/initial-map-center"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import {
  isLocateFollowingVisible,
  reduceLocateFollowing,
} from "@/features/map/lib/locate-following"
import { LocationListItem } from "@/features/meetup/components/location-list-item"
import { FAB_BOTTOM_FLOOR } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const MapCanvas = dynamic(
  () => import("@/features/map/components/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-gray-100" /> }
)

interface MeetupLocationMapProps {
  /** 내 위치 (상위에서 관리) */
  position: Coordinates | null
  /** 첫 GPS terminal 결과 — loading 중에는 지도 엔진을 마운트하지 않는다 */
  initialStatus: GeolocationStatus
  onBack: () => void
  /** 검색바 탭 → 검색 화면 전환 */
  onOpenSearch: () => void
  /** "이 주소에 대한 장소명 입력하기" → 직접 입력 화면 (역지오코딩된 주소 + 좌표 전달) */
  onCreateName: (address: string, coords: Coordinates) => void
  /** 목록에서 장소를 고르면 그 장소(좌표 포함)를 확정한다 */
  onSelectPlace: (place: Place) => void
}

/**
 * 장소 선택 - 지도 화면. 핀은 보이는 영역 정중앙에 화면 고정되어 있고, 사용자가 지도를 움직여
 * 원하는 지점을 핀 아래로 가져온다. 선택/해제 개념이 없으므로 항상 정확히 한 지점이 선택된 상태다.
 * 지도가 멈추면 그 지점을 역지오코딩하고 주변 장소를 갱신한다. GPS 버튼으로 내 위치로 재중심. (#313)
 */
function MeetupLocationMap({
  position,
  initialStatus,
  onBack,
  onOpenSearch,
  onCreateName,
  onSelectPlace,
}: MeetupLocationMapProps) {
  const { messages } = useTranslation()
  const t = messages.selectLocation

  // centerTarget: 화면 고정 핀이 가리키는 지점 — 지도가 멈출 때마다 지도 중심에서 읽어온다.
  const [centerTarget, setCenterTarget] = React.useState<Coordinates | null>(null)
  // 지도가 움직이는 동안에는 핀을 띄우고 주소를 스켈레톤으로 둔다.
  const [isMoving, setIsMoving] = React.useState(false)
  // 첫 GPS terminal 결과가 error면 늦게 도착한 좌표가 fallback viewport와 다른 장소를
  // 자동 선택하지 않게 한다. 사용자가 GPS 버튼을 누를 때만 현재 위치 입력을 다시 허용한다.
  const [hasExplicitRecenter, setHasExplicitRecenter] = React.useState(false)
  // GPS 버튼으로 지도를 내 위치에 맞춘 상태인지. 아이콘 색으로만 드러난다.
  // 내 위치를 잃은 동안은 표시할 근거가 없어 좌표 유무와 함께 파생시킨다.
  const [followRequested, setFollowRequested] = React.useState(false)

  // 인셋 보정 같은 프로그램적 이동은 핀 아래 좌표를 바꾸지 않으므로 같은 격자 칸으로 되돌아온다.
  // 그때 상태 객체의 동일성을 유지해 불필요한 재조회와 effect 재실행을 막는다.
  const handleCenterSettle = React.useCallback((next: Coordinates) => {
    setIsMoving(false)
    setCenterTarget((prev) => (isSameCoordinate(prev, next) ? prev : next))
  }, [])

  const handleCenterMoveStart = React.useCallback(() => {
    setIsMoving(true)
  }, [])
  // 지도 뷰 이동은 recenterKey(nonce)로만 구동한다. position은 실시간 갱신되어도 뷰를 움직이지 않는다.
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const recenterTo = React.useCallback((target: Coordinates) => {
    setRecenterTarget(target)
    setRecenterKey((key) => key + 1)
  }, [])

  const isFallbackLocked = initialStatus === "error" && !hasExplicitRecenter

  // GPS를 받기 전에는 지도 엔진을 만들지 않는다. 정상 경로는 이 GPS 좌표로 최초 마운트되어
  // 서울 기본 좌표→현재 위치 flyToBounds가 발생하지 않는다.
  const initialMapCenter = resolveInitialMapCenter({
    position: isFallbackLocked ? null : position,
    status: initialStatus,
    fallbackCenter: DEFAULT_MAP_CENTER,
  })

  // 선택 지점은 항상 화면 고정 핀 아래 — 즉 지도 중심이다.
  const target = centerTarget

  // GPS 버튼: 내 위치를 drawer/헤더 제외한 보이는 영역 정중앙으로.
  const handleGps = () => {
    if (!position) return
    setHasExplicitRecenter(true)
    recenterTo(position)
    setFollowRequested((state) => reduceLocateFollowing(state, { type: "recenter-to-me" }))
  }

  const isFollowingMe = isLocateFollowingVisible(followRequested, position)

  const { data: reverseGeocoded } = useReverseGeocode(target)
  const currentAddress = reverseGeocoded?.fullAddress ?? reverseGeocoded?.shortLabel ?? null
  // 이동 중에는 이전 지점의 주소가 남아 오해를 주므로 스켈레톤으로 가린다.
  const locationSubtitle =
    isMoving || !currentAddress ? (
      <>
        <span className="sr-only">{t.loadingAddress}</span>
        <span
          className="my-1 inline-block h-4 w-40 animate-pulse rounded bg-gray-100 align-middle"
          aria-hidden
        />
      </>
    ) : (
      currentAddress
    )

  // 전용 "주변 장소" 엔드포인트가 없어, 역지오코딩된 지역명으로 검색해 근사한다. (백엔드 확정 시 교체 — #47)
  const { data: nearbyPlaces, isFetching: isSearchingNearby } = usePlaceSearch(
    reverseGeocoded?.shortLabel ?? "",
    target
  )

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
      {initialMapCenter ? (
        <MapCanvas
          center={recenterTarget ?? initialMapCenter}
          recenterKey={recenterKey}
          centerZoom={DEFAULT_MAP_ZOOM}
          animateCenter
          topInset={topInset}
          bottomInset={bottomInset}
          className="absolute inset-0 z-0 size-full"
          // 탭으로 지점을 고르는 경로가 사라져 recenter-elsewhere는 더 이상 필요 없다.
          // center-pin에서는 팬 자체가 "내 위치에서 벗어났다"는 신호이고, user-gesture가 그걸 덮는다.
          onUserGesture={() =>
            setFollowRequested((state) => reduceLocateFollowing(state, { type: "user-gesture" }))
          }
          livePosition={position}
          alignCenterToVisibleArea
          onCenterMoveStart={handleCenterMoveStart}
          onCenterSettle={handleCenterSettle}
        />
      ) : (
        <MapLoadingSkeleton />
      )}

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

        {/* 지도 위 스페이서 — 클릭이 지도로 통과, GPS 버튼만 클릭 가능.
            높이가 곧 '헤더·시트를 제외한 보이는 영역'이므로, 이 박스의 정중앙이
            MapCanvas에 넘기는 topInset/bottomInset으로 계산되는 중심과 같은 지점이다. */}
        <div className="relative flex-1">
          <MapCenterPin isLifted={isMoving} />
          <button
            type="button"
            aria-label={t.currentLocationLabel}
            aria-pressed={isFollowingMe}
            onClick={handleGps}
            disabled={!position}
            className={`pointer-events-auto absolute ${FAB_BOTTOM_FLOOR} right-4 flex size-[46px] items-center justify-center rounded-full bg-white shadow-[0px_2px_2px_0px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <CrossfadeIcon
              baseSrc="/icons/circle/location.svg"
              activeSrc="/icons/circle/location-primary.svg"
              active={isFollowingMe}
            />
          </button>
        </div>

        {/* 하단 시트 — 바깥은 둥근 모서리로 클립(스크롤바가 drawer 밖으로 나가지 않게),
            안쪽만 스크롤. 직접입력 진입 행 + 주변 장소가 함께 스크롤된다.

            높이를 내용에 맞추지 않고 고정하는 이유: 지도를 팬할 때마다 주변 장소 개수와
            주소 줄 수가 달라지는데, 그때마다 시트가 늘었다 줄면 화면이 출렁이고 인셋이
            바뀌어 지도 보정까지 연쇄로 발동한다. 높이를 묶어 두면 내용만 교체된다. */}
        <div
          ref={sheetRef}
          className="pointer-events-auto shrink-0 overflow-hidden rounded-t-2xl bg-white shadow-[0px_-2px_20px_0px_rgba(0,0,0,0.08)]"
        >
          <div className="flex h-72 flex-col gap-4 overflow-y-auto px-4 pt-6 pb-[calc(0.75rem+var(--safe-area-bottom))]">
            <LocationListItem
              iconSrc="/icons/write/location-plus.svg"
              title={t.createPlaceTitle}
              subtitle={locationSubtitle}
              actionLabel={t.createPlaceButton}
              actionVariant="filled"
              disabled={!currentAddress || !target}
              onAction={() => currentAddress && target && onCreateName(currentAddress, target)}
            />

            {/* 새 좌표의 결과가 도착할 때까지 이전 목록을 그대로 두고 흐리게만 처리한다.
                목록이 사라졌다 나타나지 않아야 팬 중에도 화면이 안정적이다. */}
            <div
              className={cn(
                "flex flex-col gap-4 transition-opacity duration-base ease-base",
                (isMoving || isSearchingNearby) && "opacity-40"
              )}
            >
              {nearbyPlaces?.length === 0 ? (
                <p className="py-2 text-body-regular-14 text-gray-500">{t.searchEmpty}</p>
              ) : (
                nearbyPlaces?.map((place) => (
                  <LocationListItem
                    key={place.id}
                    iconSrc="/icons/write/location-list.svg"
                    title={place.name}
                    subtitle={place.address}
                    actionLabel={t.selectButton}
                    onAction={() => onSelectPlace(place)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { MeetupLocationMap }
