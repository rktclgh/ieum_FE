"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import type { MapBounds, MapPin, PinType } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapAttribution } from "@/features/map/components/map-attribution"
import { MapControls } from "@/features/map/components/map-controls"
import { MapLoadingSkeleton } from "@/features/map/components/map-loading-skeleton"
import { MapSearchBar } from "@/features/map/components/map-search-bar"
import { PinListOverlay } from "@/features/map/components/pin-list-overlay"
import { PinStackSheet } from "@/features/map/components/pin-stack-sheet"
import { SearchOverlay } from "@/features/map/components/search-overlay"
import {
  DEFAULT_MAP_CENTER,
  MAP_BOTTOM_INSET,
  MAP_LOCATION_WAIT_MS,
  MAP_READY_MAX_WAIT_MS,
  MAP_TOP_INSET,
} from "@/features/map/constants/map"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import {
  createLastKnownLocationSyncCoordinator,
} from "@/features/map/lib/last-known-location-sync"
import {
  isLocateFollowingVisible,
  reduceLocateFollowing,
} from "@/features/map/lib/locate-following"
import { CreateMeetupScreen } from "@/features/meetup/components/create-meetup-screen"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
import { useUpdateLocation } from "@/features/my/hooks/use-my-mutations"
import { useTabTransition } from "@/features/navigation/hooks/use-tab-transition"
import { InstallPrompt } from "@/features/pwa/components/install-prompt"
import { CreateQuestionScreen } from "@/features/question/components/create-question-screen"
import { QuestionDetailContainer } from "@/features/question/components/question-detail-container"
import { SessionAlarmButton } from "@/features/session/components/session-alarm-button"
import { useMe } from "@/features/session/hooks/use-me"
import { APP_BAR_SAFE_TOP, FAB_BOTTOM_WITH_TABBAR } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

// 스켈레톤 페이드아웃 시간(ms). CSS transition-opacity duration과 맞춘다.
const SKELETON_FADE_MS = 500

const MapCanvas = dynamic(
  () => import("@/features/map/components/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-gray-100" /> }
)

// dynamic()은 컴포넌트가 실제로 렌더될 때 청크를 받기 시작한다. 지도는 GPS를 확보한 뒤에야
// 렌더되므로, 그대로 두면 "측위 대기 → 그제서야 maplibre 청크 내려받기"가 직렬로 이어진다.
// 마운트 즉시 같은 모듈을 import해 두 작업을 병렬로 돌린다(번들러가 dynamic과 같은 청크로 합쳐 중복 요청은 없다).
function preloadMapCanvas() {
  void import("@/features/map/components/map-canvas")
}

// UI 카테고리("meetup") → 핀 API type("meeting") 매핑. "all"은 필터 없음(undefined).
function toPinType(category: Category): PinType | undefined {
  if (category === "meetup") return "meeting"
  if (category === "question") return "question"
  return undefined
}

// 사용자가 홈 지도에 꽂은 단일 핀. 검색 출신은 label/address를 갖고, 지도 클릭 출신은 좌표만 갖는다.
interface SelectedLocation {
  lat: number
  lng: number
  label?: string
  address?: string
}

function HomeMapScreen() {
  const { messages } = useTranslation()
  const { data: me } = useMe()
  const { position, status } = useGeolocation()
  const { mutate: updateLocation } = useUpdateLocation()
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const [selectedLocation, setSelectedLocation] = React.useState<SelectedLocation | null>(null)
  const [createMeetupOpen, setCreateMeetupOpen] = React.useState(false)
  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<number | null>(null)
  // 좌표가 겹쳐 지도에서 분리할 수 없는 핀 더미 — 가로 캐러셀로 연다.
  const [stackedPins, setStackedPins] = React.useState<MapPin[] | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null)
  const [category, setCategory] = React.useState<Category>("all")
  const [bounds, setBounds] = React.useState<MapBounds | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [isListOpen, setListOpen] = React.useState(false)
  // 위치 버튼으로 지도를 내 위치에 맞춘 상태인지. 아이콘 색으로만 드러난다.
  // 내 위치를 잃은 동안은 표시할 근거가 없어 좌표 유무와 함께 파생시킨다.
  const [followRequested, setFollowRequested] = React.useState(false)
  const isFollowingMe = isLocateFollowingVisible(followRequested, position)

  // 검색으로 고른 핀은 이미 label/address를 가지므로 역지오코딩하지 않는다.
  // 좌표만 있는(지도 클릭) 핀에만 역지오코딩해 검색바 라벨과 프리필용 주소를 얻는다.
  const geoTarget = selectedLocation && !selectedLocation.label ? selectedLocation : null
  const { data: reverseGeocoded } = useReverseGeocode(geoTarget)
  const selectedLocationLabel = selectedLocation
    ? (selectedLocation.label ?? reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress ?? null)
    : null

  // 만들기 화면 프리필용 값. 검색 핀은 label/address를 바로 갖고,
  // 지도 클릭 핀은 역지오코딩이 끝나야 채워진다(그 전에는 null → 프리필 안 함).
  const selectedPlaceLabel =
    selectedLocation?.label ?? reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress
  const selectedPlaceAddress =
    selectedLocation?.address ?? reverseGeocoded?.fullAddress ?? reverseGeocoded?.shortLabel
  const selectedPlace: MeetupPlaceValue | null =
    selectedLocation && selectedPlaceLabel && selectedPlaceAddress
      ? {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: selectedPlaceAddress,
          label: selectedPlaceLabel,
        }
      : null

  const { data: pinData } = useMapPins(bounds, toPinType(category))
  const pins = pinData?.pins

  const lastLocationSyncUserIdRef = React.useRef<number | null>(null)
  const updateLocationRef = React.useRef(updateLocation)
  const locationSyncCoordinatorRef = React.useRef<ReturnType<
    typeof createLastKnownLocationSyncCoordinator
  > | null>(null)

  React.useEffect(() => {
    updateLocationRef.current = updateLocation
    const locationSyncCoordinator =
      locationSyncCoordinatorRef.current ??
      (locationSyncCoordinatorRef.current = createLastKnownLocationSyncCoordinator(
        (payload, callbacks) => {
          updateLocationRef.current(payload, callbacks)
        }
      ))

    const userId = me?.userId ?? null
    if (lastLocationSyncUserIdRef.current !== userId) {
      lastLocationSyncUserIdRef.current = userId
      locationSyncCoordinator.reset()
    }

    if (!me || !position) return

    locationSyncCoordinator.sync(position, true)
  }, [me, position, updateLocation])

  const handlePinClick = React.useCallback((pin: MapPin) => {
    // 핀 종류별로 그 대상(targetId) 상세 바텀시트를 지도 위 오버레이로 연다.
    if (pin.pinType === "meeting") setSelectedMeetingId(pin.targetId)
    else if (pin.pinType === "question") setSelectedQuestionId(pin.targetId)
  }, [])

  // 지도 뷰 이동은 recenterKey(nonce)로만 구동한다. target을 정하고 key를 올리면 그 좌표로 이동.
  const recenterTo = React.useCallback((target: Coordinates) => {
    setRecenterTarget(target)
    setRecenterKey((key) => key + 1)
  }, [])

  // 서버(navigator 없음→status "error")와 클라 첫 렌더(status "loading")의 분기가 달라 hydration이
  // 어긋나므로, 마운트 완료 전에는 항상 스켈레톤을 그려 서버/클라 첫 렌더를 일치시킨다.
  // useSyncExternalStore로 서버/hydration=false, 이후=true를 안전하게 얻는다(setState-in-effect 회피).
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // 진입 시 내 위치를 확보할 때까지 지도를 그리지 않는다 — 명동(기본 좌표)→내 위치로 날아가는 모션을 없앤다.
  // 단 상한 시간을 넘기면 기본 좌표로 먼저 띄운다(GPS가 오래 걸리거나 실패해도 무한 대기 방지).
  // status가 이미 확정된 경우엔 타이머를 걸지 않아 불필요한 리렌더를 막는다.
  const [waitedForLocation, setWaitedForLocation] = React.useState(false)
  React.useEffect(() => {
    if (status !== "loading") return
    const timer = setTimeout(() => setWaitedForLocation(true), MAP_LOCATION_WAIT_MS)
    return () => clearTimeout(timer)
  }, [status])

  // 측위를 기다리는 동안 지도 청크를 미리 받아 둔다(위 preloadMapCanvas 참고).
  React.useEffect(preloadMapCanvas, [])

  const canShowMap = isMounted && (status !== "loading" || waitedForLocation)

  // 이 마운트가 탭 전환 슬라이드 애니메이션과 함께 일어났는지. 첫 렌더 값만 의미가 있으므로
  // (콜드 로드는 애니메이션이 없다) state 초기화 함수로 한 번만 캡처해 이후 재렌더에 흔들리지 않게 한다.
  const transitionDirection = useTabTransition()
  const [hadEntranceAnimation] = React.useState(() => transitionDirection !== null)

  // 베이스맵이 실제로 그려졌는지. 이 신호 전에 스켈레톤을 걷으면 스타일·타일을 받는 동안
  // 도로망도 없는 빈 회색 배경(dynamic import 폴백)이 그대로 드러난다.
  // 스타일 요청이 실패하면 onReady가 영영 오지 않으므로 상한을 두고 강제로 진행시킨다.
  const [tilesReady, setTilesReady] = React.useState(false)
  // 탭 전환 애니메이션이 걸린 마운트에서만 의미가 있다 — 애니메이션 중엔 지도 조상이 fixed
  // 자식의 containing block이 되어 컨테이너 크기가 일시적으로 뒤틀린다(issue #355). 크기가
  // 최종값으로 자리잡기 전에 스켈레톤을 걷으면, 잘못된 크기의 지도가 잠깐 보였다가 애니메이션이
  // 끝난 뒤 툭 튀는 스냅이 생긴다. 애니메이션이 없는 콜드 로드는 처음부터 크기가 옳으므로 바로 true.
  const [sizeSettled, setSizeSettled] = React.useState(!hadEntranceAnimation)
  const isMapReady = tilesReady && sizeSettled
  React.useEffect(() => {
    if (!canShowMap || isMapReady) return
    const timer = setTimeout(() => {
      setTilesReady(true)
      setSizeSettled(true)
    }, MAP_READY_MAX_WAIT_MS)
    return () => clearTimeout(timer)
  }, [canShowMap, isMapReady])

  // 지도가 준비되면 스켈레톤을 즉시 걷어내지 않고, 지도 위에 겹친 채 페이드아웃한 뒤 언마운트한다.
  // 스켈레톤→지도로 뚝 끊기지 않고 부드럽게 크로스페이드된다.
  const [showSkeleton, setShowSkeleton] = React.useState(true)
  React.useEffect(() => {
    if (!isMapReady) return
    const timer = setTimeout(() => setShowSkeleton(false), SKELETON_FADE_MS)
    return () => clearTimeout(timer)
  }, [isMapReady])

  // 최초 위치 확보 1회: 내 위치로 자동 중심. 지도는 canShowMap 시점의 최선 좌표(내 위치 또는 기본 좌표)로
  // 마운트되므로, 정상 경로(위치를 알고 마운트)에선 같은 좌표라 이동이 없고,
  // 상한 초과 폴백 후 뒤늦게 위치가 잡힌 경우에만 부드럽게 재중심된다.
  const hasCenteredRef = React.useRef(false)
  React.useEffect(() => {
    if (hasCenteredRef.current || !position) return
    hasCenteredRef.current = true
    recenterTo(position)
  }, [position, recenterTo])

  // 위치 버튼: 현재 내 위치를 화면 정중앙으로. 좌표가 없으면 아무 일도 하지 않으므로 상태도 켜지 않는다.
  const handleRecenter = React.useCallback(() => {
    if (!position) return
    recenterTo(position)
    setFollowRequested((state) => reduceLocateFollowing(state, { type: "recenter-to-me" }))
  }, [position, recenterTo])

  return (
    <div className="fixed inset-0 flex w-full flex-col overflow-hidden">
      {canShowMap ? (
        <MapCanvas
          center={recenterTarget ?? position ?? DEFAULT_MAP_CENTER}
          recenterKey={recenterKey}
          animateCenter
          topInset={MAP_TOP_INSET}
          bottomInset={MAP_BOTTOM_INSET}
          className="absolute inset-0 z-0 size-full"
          onMapClick={(position) => {
            // 다른 지점을 골랐으므로 더는 "내 위치 기준"이 아니다.
            setSelectedLocation({ lat: position.lat, lng: position.lng })
            setFollowRequested((state) => reduceLocateFollowing(state, { type: "recenter-elsewhere" }))
          }}
          onUserGesture={() =>
            setFollowRequested((state) => reduceLocateFollowing(state, { type: "user-gesture" }))
          }
          onBoundsChange={setBounds}
          onReady={() => setTilesReady(true)}
          onSizeSettle={() => setSizeSettled(true)}
          pins={pins}
          onPinClick={handlePinClick}
          onPinStackClick={setStackedPins}
          livePosition={position}
          selectedPosition={selectedLocation}
          onSelectedPositionClick={() => setSelectedLocation(null)}
        />
      ) : null}

      {showSkeleton ? (
        <MapLoadingSkeleton
          className={cn(
            "z-[1] transition-opacity duration-500 ease-out",
            isMapReady ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}

      {/* 홈 지도는 AppBar 없이 툴바를 직접 그린다 — 상단 safe-area도 직접 받는다 (issue #279). */}
      <div className={`relative z-10 app-column flex flex-col gap-2 px-4 pb-4 ${APP_BAR_SAFE_TOP}`}>
        <div className="flex items-center gap-2">
          <MapSearchBar
            onFocus={() => setSearchOpen(true)}
            selectedLocationLabel={selectedLocationLabel}
            onClearSelectedLocation={() => setSelectedLocation(null)}
          />
          <SessionAlarmButton />
        </div>
        <CategoryChipGroup value={category} onChange={setCategory} />

        {pinData?.truncated && (
          <p className="self-center rounded-full bg-gray-900/80 px-3 py-1 text-body-regular-12 text-white">
            {messages.home.pinsTruncatedNotice}
          </p>
        )}
      </div>

      {/* 지도는 풀블리드지만 컨트롤·저작권 표기는 앱 전역 app-column에 맞춰 중앙 정렬 유지.
          wrapper는 pointer-events-none으로 지도 클릭을 통과시키고, 실제 컨트롤만 pointer-events-auto. */}
      <div className="pointer-events-none absolute inset-0 z-10 app-column">
        {/* 모임 만들기·질문하기 모두 상태 기반 풀스크린 오버레이로 연결한다. */}
        <MapControls
          onRecenter={handleRecenter}
          isLocateActive={isFollowingMe}
          onCreateMeetup={() => setCreateMeetupOpen(true)}
          onCreateQuestion={() => setCreateQuestionOpen(true)}
          onListView={() => setListOpen(true)}
          className={`pointer-events-auto absolute right-4 ${FAB_BOTTOM_WITH_TABBAR} flex flex-col gap-2`}
        />

        <MapAttribution className="pointer-events-auto absolute bottom-[calc(5rem+var(--safe-area-bottom))] left-3" />
      </div>

      <SearchOverlay
        open={isSearchOpen}
        near={position}
        onClose={() => setSearchOpen(false)}
        onSelectPlace={(place) => {
          setSelectedLocation({
            lat: place.lat,
            lng: place.lng,
            label: place.name,
            address: place.address,
          })
          // 검색 결과는 내 위치가 아니므로 팔로잉 표시를 끈다.
          recenterTo({ lat: place.lat, lng: place.lng })
          setFollowRequested((state) => reduceLocateFollowing(state, { type: "recenter-elsewhere" }))
          setSearchOpen(false)
        }}
        onOpenMeetup={(id) => setSelectedMeetingId(id)}
        onOpenQuestion={(id) => setSelectedQuestionId(id)}
      />

      <PinListOverlay
        open={isListOpen}
        bounds={bounds}
        onClose={() => setListOpen(false)}
        onOpenMeetup={(id) => setSelectedMeetingId(id)}
        onOpenQuestion={(id) => setSelectedQuestionId(id)}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
      />

      <CreateMeetupScreen
        open={createMeetupOpen}
        initialPlace={selectedPlace}
        currentPosition={position}
        onClose={() => setCreateMeetupOpen(false)}
      />

      <CreateQuestionScreen
        open={createQuestionOpen}
        initialPlace={selectedPlace}
        currentPosition={position}
        onClose={() => setCreateQuestionOpen(false)}
      />

      {stackedPins !== null ? (
        <PinStackSheet pins={stackedPins} onClose={() => setStackedPins(null)} />
      ) : null}

      {selectedMeetingId !== null ? (
        <MeetupDetailContainer
          meetingId={selectedMeetingId}
          onClose={() => setSelectedMeetingId(null)}
        />
      ) : null}

      {selectedQuestionId !== null ? (
        <QuestionDetailContainer
          questionId={selectedQuestionId}
          onClose={() => setSelectedQuestionId(null)}
        />
      ) : null}

      <InstallPrompt />
    </div>
  )
}

export { HomeMapScreen }
