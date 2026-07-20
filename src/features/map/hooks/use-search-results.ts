"use client"

import * as React from "react"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { usePinList } from "@/features/map/hooks/use-pin-list"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
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

  const { meetups, questions } = React.useMemo(() => {
    if (hasQuery) {
      if (!pins) return { meetups: [] as MapPin[], questions: [] as MapPin[] }
      const matched = pins.filter((pin) => hangulIncludes(pin.title, trimmed))
      return {
        meetups: matched.filter((pin) => pin.pinType === "meeting"),
        questions: matched.filter((pin) => pin.pinType === "question"),
      }
    }
    const sorted = sortByDistance(nearbyPinData?.pins ?? [], near)
    return {
      meetups: sorted.filter((pin) => pin.pinType === "meeting"),
      questions: sorted.filter((pin) => pin.pinType === "question"),
    }
  }, [hasQuery, pins, trimmed, nearbyPinData, near])

  return {
    meetups,
    questions,
    places: hasQuery ? (places ?? []) : [],
    isLoading: hasQuery ? pinsLoading || placesLoading : nearbyLoading,
  }
}

export { useSearchResults }
export type { SearchResults }
