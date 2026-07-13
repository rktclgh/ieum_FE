"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import type { Place } from "@/features/map/api/place-search-api"
import type { MapBounds, MapPin, PinType } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapAttribution } from "@/features/map/components/map-attribution"
import { MapControls } from "@/features/map/components/map-controls"
import { MapSearchBar } from "@/features/map/components/map-search-bar"
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
  const { position, accuracy, isFollowing, toggleFollow, stopFollow } = useGeolocation()
  const [focusedPlace, setFocusedPlace] = React.useState<Place | null>(null)
  const [clickedPosition, setClickedPosition] = React.useState<Coordinates | null>(null)
  const [createMeetupOpen, setCreateMeetupOpen] = React.useState(false)
  const [createQuestionOpen, setCreateQuestionOpen] = React.useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<number | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<number | null>(null)
  const [category, setCategory] = React.useState<Category>("all")
  const [bounds, setBounds] = React.useState<MapBounds | null>(null)

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

  // follow-me 토글: 켤 때는 검색/클릭 선택을 비워 지도가 내 위치를 따라가게 한다.
  const handleToggleFollow = React.useCallback(() => {
    if (!isFollowing) {
      setFocusedPlace(null)
      setClickedPosition(null)
    }
    toggleFollow()
  }, [isFollowing, toggleFollow])

  const center = focusedPlace ? { lat: focusedPlace.lat, lng: focusedPlace.lng } : position

  return (
    <div className="fixed inset-0 mx-auto flex w-full max-w-sm flex-col overflow-hidden">
      <MapCanvas
        center={center}
        className="absolute inset-0 z-0 size-full"
        onMapClick={(position) => {
          setFocusedPlace(null)
          setClickedPosition(position)
        }}
        onBoundsChange={setBounds}
        pins={pins}
        onPinClick={handlePinClick}
        livePosition={isFollowing ? position : null}
        liveAccuracy={isFollowing ? accuracy : null}
        onUserPan={isFollowing ? stopFollow : undefined}
      />

      <div className="relative z-10 flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <MapSearchBar
            near={position}
            onSelectPlace={(place) => {
              setClickedPosition(null)
              setFocusedPlace(place)
            }}
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
        onToggleFollow={handleToggleFollow}
        isFollowing={isFollowing}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />

      <MapAttribution className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-10" />

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-sm">
        <TabBar />
      </div>

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
