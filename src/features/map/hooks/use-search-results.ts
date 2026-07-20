"use client"

import * as React from "react"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { usePinList } from "@/features/map/hooks/use-pin-list"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { roundCoordinateValue } from "@/features/map/lib/coordinate-precision"
import { sortByDistance } from "@/features/map/lib/distance"
import { hangulIncludes } from "@/lib/hangul-includes"

interface SearchResults {
  meetups: MapPin[]
  questions: MapPin[]
  places: Place[]
  isLoading: boolean
}

// 쿼리가 있으면 전체 핀을 제목으로 매칭(usePinList)하고, 없으면 지도 bounds 내 핀을
// 내 위치 기준 거리순으로 정렬(useMapPins + sortByDistance)해 "주변" 리스트로 보여준다.
// 카드별 상세 fetch(참여인원·설명)는 카드 컴포넌트에서 지연 수행한다.
function useSearchResults(
  query: string,
  near: Coordinates | null,
  bounds: MapBounds | null
): SearchResults {
  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  const { data: pins, isLoading: pinsLoading } = usePinList(hasQuery)
  const { data: places, isLoading: placesLoading } = usePlaceSearch(trimmed, near)
  const { data: nearbyPinData, isLoading: nearbyLoading } = useMapPins(hasQuery ? null : bounds)

  // watchPosition은 좌표가 그대로여도 갱신마다 새 객체를 준다. 격자에 스냅해두지 않으면
  // GPS 콜백마다 정렬이 다시 돌아 리스트가 사용자 손 밑에서 재배열된다(usePlaceSearch와 동일 이유).
  const nearLat = near ? roundCoordinateValue(near.lat) : null
  const nearLng = near ? roundCoordinateValue(near.lng) : null
  const snappedNear = React.useMemo(
    () => (nearLat === null || nearLng === null ? null : { lat: nearLat, lng: nearLng }),
    [nearLat, nearLng]
  )

  const { meetups, questions } = React.useMemo(() => {
    if (hasQuery) {
      if (!pins) return { meetups: [] as MapPin[], questions: [] as MapPin[] }
      const matched = pins.filter((pin) => hangulIncludes(pin.title, trimmed))
      return {
        meetups: matched.filter((pin) => pin.pinType === "meeting"),
        questions: matched.filter((pin) => pin.pinType === "question"),
      }
    }
    const sorted = sortByDistance(nearbyPinData?.pins ?? [], snappedNear)
    return {
      meetups: sorted.filter((pin) => pin.pinType === "meeting"),
      questions: sorted.filter((pin) => pin.pinType === "question"),
    }
  }, [hasQuery, pins, trimmed, nearbyPinData, snappedNear])

  return {
    meetups,
    questions,
    places: hasQuery ? (places ?? []) : [],
    // bounds가 아직 없으면(지도 mount 전) 쿼리가 비활성이라 nearbyLoading이 false다.
    // 그대로 두면 데이터가 오기 전에 "결과 없음"이 먼저 번쩍이므로 로딩으로 취급한다.
    isLoading: hasQuery ? pinsLoading || placesLoading : bounds === null || nearbyLoading,
  }
}

export { useSearchResults }
export type { SearchResults }
