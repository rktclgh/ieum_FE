"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { MapBounds, MapPin, PinType } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapAttribution } from "@/features/map/components/map-attribution"
import { MapControls } from "@/features/map/components/map-controls"
import { MapLoadingSkeleton } from "@/features/map/components/map-loading-skeleton"
import { MapSearchBar } from "@/features/map/components/map-search-bar"
import { PinListOverlay } from "@/features/map/components/pin-list-overlay"
import { SearchOverlay } from "@/features/map/components/search-overlay"
import {
  DEFAULT_MAP_CENTER,
  MAP_BOTTOM_INSET,
  MAP_LOCATION_WAIT_MS,
  MAP_TOP_INSET,
} from "@/features/map/constants/map"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import { CreateMeetupScreen } from "@/features/meetup/components/create-meetup-screen"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
import { CreateQuestionScreen } from "@/features/question/components/create-question-screen"
import { QuestionDetailContainer } from "@/features/question/components/question-detail-container"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { SessionAlarmButton } from "@/features/session/components/session-alarm-button"
import { useMe } from "@/features/session/hooks/use-me"
import { FAB_BOTTOM_WITH_TABBAR } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"
import { cn } from "@/lib/utils"

// 스켈레톤 페이드아웃 시간(ms). CSS transition-opacity duration과 맞춘다.
const SKELETON_FADE_MS = 500

const MapCanvas = dynamic(
  () => import("@/features/map/components/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-gray-100" /> }
)

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
  const router = useRouter()
  const { data: me } = useMe()
  const isLoggedIn = Boolean(me)
  const [loginPromptOpen, setLoginPromptOpen] = React.useState(false)
  // 모임/질문 생성은 로그인 필요. 게스트가 누르면 폼 대신 로그인 안내 다이얼로그를 띄운다.
  const requireAuth = (action: () => void) => (isLoggedIn ? action() : setLoginPromptOpen(true))
  const { position, status } = useGeolocation()
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const [selectedLocation, setSelectedLocation] = React.useState<SelectedLocation | null>(null)
  const [createMeetupOpen, setCreateMeetupOpen] = React.useState(false)
  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<number | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null)
  const [category, setCategory] = React.useState<Category>("all")
  const [bounds, setBounds] = React.useState<MapBounds | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [isListOpen, setListOpen] = React.useState(false)

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

  const canShowMap = isMounted && (status !== "loading" || waitedForLocation)

  // 지도가 마운트되면 스켈레톤을 즉시 걷어내지 않고, 지도 위에 겹친 채 페이드아웃한 뒤 언마운트한다.
  // 스켈레톤→지도로 뚝 끊기지 않고 부드럽게 크로스페이드된다.
  const [showSkeleton, setShowSkeleton] = React.useState(true)
  React.useEffect(() => {
    if (!canShowMap) return
    const timer = setTimeout(() => setShowSkeleton(false), SKELETON_FADE_MS)
    return () => clearTimeout(timer)
  }, [canShowMap])

  // 최초 위치 확보 1회: 내 위치로 자동 중심. 지도는 canShowMap 시점의 최선 좌표(내 위치 또는 기본 좌표)로
  // 마운트되므로, 정상 경로(위치를 알고 마운트)에선 같은 좌표라 이동이 없고,
  // 상한 초과 폴백 후 뒤늦게 위치가 잡힌 경우에만 부드럽게 재중심된다.
  const hasCenteredRef = React.useRef(false)
  React.useEffect(() => {
    if (hasCenteredRef.current || !position) return
    hasCenteredRef.current = true
    recenterTo(position)
  }, [position, recenterTo])

  // 위치 버튼: 현재 내 위치를 화면 정중앙으로.
  const handleRecenter = React.useCallback(() => {
    if (position) recenterTo(position)
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
          onMapClick={(position) => setSelectedLocation({ lat: position.lat, lng: position.lng })}
          onBoundsChange={setBounds}
          pins={pins}
          onPinClick={handlePinClick}
          livePosition={position}
          selectedPosition={selectedLocation}
          onSelectedPositionClick={() => setSelectedLocation(null)}
        />
      ) : null}

      {showSkeleton ? (
        <MapLoadingSkeleton
          className={cn(
            "z-[1] transition-opacity duration-500 ease-out",
            canShowMap ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col gap-2 p-4">
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

      {/* 지도는 풀블리드지만 컨트롤·저작권 표기는 앱 전역 max-w-sm 컬럼에 맞춰 중앙 정렬 유지.
          wrapper는 pointer-events-none으로 지도 클릭을 통과시키고, 실제 컨트롤만 pointer-events-auto. */}
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto w-full max-w-sm">
        {/* 모임 만들기·질문하기 모두 상태 기반 풀스크린 오버레이로 연결한다. */}
        <MapControls
          onRecenter={handleRecenter}
          onCreateMeetup={() => requireAuth(() => setCreateMeetupOpen(true))}
          onCreateQuestion={() => requireAuth(() => setCreateQuestionOpen(true))}
          onListView={() => setListOpen(true)}
          className={`pointer-events-auto absolute right-4 ${FAB_BOTTOM_WITH_TABBAR} flex flex-col gap-2`}
        />

        <MapAttribution className="pointer-events-auto absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-sm">
        <TabBar />
      </div>

      {isSearchOpen ? (
        <SearchOverlay
          near={position}
          onClose={() => setSearchOpen(false)}
          onSelectPlace={(place) => {
            setSelectedLocation({
              lat: place.lat,
              lng: place.lng,
              label: place.name,
              address: place.address,
            })
            recenterTo({ lat: place.lat, lng: place.lng })
            setSearchOpen(false)
          }}
          onOpenMeetup={(id) => setSelectedMeetingId(id)}
          onOpenQuestion={(id) => setSelectedQuestionId(id)}
        />
      ) : null}

      {isListOpen ? (
        <PinListOverlay
          bounds={bounds}
          onClose={() => setListOpen(false)}
          onOpenMeetup={(id) => setSelectedMeetingId(id)}
          onOpenQuestion={(id) => setSelectedQuestionId(id)}
          onCreateMeetup={() => requireAuth(() => setCreateMeetupOpen(true))}
          onCreateQuestion={() => requireAuth(() => setCreateQuestionOpen(true))}
        />
      ) : null}

      {createMeetupOpen ? (
        <CreateMeetupScreen
          initialPlace={selectedPlace}
          currentPosition={position}
          onClose={() => setCreateMeetupOpen(false)}
        />
      ) : null}

      {createQuestionOpen ? (
        <CreateQuestionScreen
          initialPlace={selectedPlace}
          currentPosition={position}
          onClose={() => setCreateQuestionOpen(false)}
        />
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

      <ConfirmDialog
        open={loginPromptOpen}
        onOpenChange={setLoginPromptOpen}
        title={messages.home.loginRequiredTitle}
        description={messages.home.loginRequiredDescription}
        cancelLabel={messages.home.loginRequiredCancel}
        confirmLabel={messages.home.loginLabel}
        onConfirm={() => router.push(routes.login())}
      />
    </div>
  )
}

export { HomeMapScreen }
