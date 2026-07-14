"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import type { MapBounds, MapPin, PinType } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapAttribution } from "@/features/map/components/map-attribution"
import { MapControls } from "@/features/map/components/map-controls"
import { MapSearchBar } from "@/features/map/components/map-search-bar"
import { PinListOverlay } from "@/features/map/components/pin-list-overlay"
import { SearchOverlay } from "@/features/map/components/search-overlay"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import { CreateMeetupScreen } from "@/features/meetup/components/create-meetup-screen"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import { CreateQuestionScreen } from "@/features/question/components/create-question-screen"
import { QuestionDetailContainer } from "@/features/question/components/question-detail-container"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { SessionAlarmButton } from "@/features/session/components/session-alarm-button"
import { useTranslation } from "@/lib/i18n/use-translation"

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

function HomeMapScreen() {
  const { messages } = useTranslation()
  const { position, accuracy } = useGeolocation()
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const [clickedPosition, setClickedPosition] = React.useState<Coordinates | null>(null)
  const [createMeetupOpen, setCreateMeetupOpen] = React.useState(false)
  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<number | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null)
  const [category, setCategory] = React.useState<Category>("all")
  const [bounds, setBounds] = React.useState<MapBounds | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  const [isListOpen, setListOpen] = React.useState(false)

  const { data: reverseGeocoded } = useReverseGeocode(clickedPosition)
  const selectedLocationLabel = clickedPosition
    ? (reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress ?? null)
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

  // 최초 위치 확보 1회: 내 위치로 자동 중심 이동.
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
      <MapCanvas
        center={recenterTarget}
        recenterKey={recenterKey}
        animateCenter
        className="absolute inset-0 z-0 size-full"
        onMapClick={(position) => setClickedPosition(position)}
        onBoundsChange={setBounds}
        pins={pins}
        onPinClick={handlePinClick}
        livePosition={position}
        liveAccuracy={accuracy}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <MapSearchBar
            onFocus={() => setSearchOpen(true)}
            selectedLocationLabel={selectedLocationLabel}
            onClearSelectedLocation={() => setClickedPosition(null)}
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

      {/* 모임 만들기·질문하기 모두 상태 기반 풀스크린 오버레이로 연결한다. */}
      <MapControls
        onRecenter={handleRecenter}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
        onListView={() => setListOpen(true)}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />

      <MapAttribution className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-10" />

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-sm">
        <TabBar />
      </div>

      {isSearchOpen ? (
        <SearchOverlay
          near={position}
          onClose={() => setSearchOpen(false)}
          onSelectPlace={(place) => {
            setClickedPosition(null)
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
          onCreateMeetup={() => setCreateMeetupOpen(true)}
          onCreateQuestion={() => setCreateQuestionOpen(true)}
        />
      ) : null}

      {createMeetupOpen ? (
        <CreateMeetupScreen onClose={() => setCreateMeetupOpen(false)} />
      ) : null}

      {createQuestionOpen ? (
        <CreateQuestionScreen onClose={() => setCreateQuestionOpen(false)} />
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
    </div>
  )
}

export { HomeMapScreen }
