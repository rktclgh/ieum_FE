"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import type { Place } from "@/features/map/api/place-search-api"
import { CategoryChipGroup } from "@/features/map/components/category-chip-group"
import { MapControls } from "@/features/map/components/map-controls"
import { MapSearchBar } from "@/features/map/components/map-search-bar"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useGeolocation } from "@/features/map/hooks/use-geolocation"
import { useReverseGeocode } from "@/features/map/hooks/use-reverse-geocode"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { SessionAlarmButton } from "@/features/session/components/session-alarm-button"

const MapCanvas = dynamic(
  () => import("@/features/map/components/map-canvas").then((mod) => mod.MapCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-gray-100" /> }
)

function HomeMapScreen() {
  const { position, requestLocation } = useGeolocation()
  const [focusedPlace, setFocusedPlace] = React.useState<Place | null>(null)
  const [clickedPosition, setClickedPosition] = React.useState<Coordinates | null>(null)

  const { data: reverseGeocoded } = useReverseGeocode(clickedPosition)
  const selectedLocationLabel = clickedPosition
    ? (reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress ?? null)
    : null

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
        <CategoryChipGroup />
      </div>

      {/* 모임 만들기/질문하기 화면은 URL 미확정(docs/ROUTES.md 하위 화면 참고)이라 메뉴 토글까지만 연결 */}
      <MapControls
        onLocateMe={() => {
          setFocusedPlace(null)
          setClickedPosition(null)
          requestLocation()
        }}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </div>
  )
}

export { HomeMapScreen }
