"use client"

import * as React from "react"

import type { MapPin } from "@/features/map/api/pin-types"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePinList } from "@/features/map/hooks/use-pin-list"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { hangulIncludes } from "@/lib/hangul-includes"

interface SearchResults {
  meetups: MapPin[]
  questions: MapPin[]
  places: Place[]
  isLoading: boolean
}

// 전체 핀을 제목으로 필터해 모임/질문으로 나누고, 장소는 place 검색 API로 받는다.
// 카드별 상세 fetch(참여인원·설명)는 카드 컴포넌트에서 지연 수행한다.
function useSearchResults(query: string, near: Coordinates | null): SearchResults {
  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  const { data: pins, isLoading: pinsLoading } = usePinList(hasQuery)
  const { data: places, isLoading: placesLoading } = usePlaceSearch(trimmed, near)

  const { meetups, questions } = React.useMemo(() => {
    if (!hasQuery || !pins) return { meetups: [] as MapPin[], questions: [] as MapPin[] }
    const matched = pins.filter((pin) => hangulIncludes(pin.title, trimmed))
    return {
      meetups: matched.filter((pin) => pin.pinType === "meeting"),
      questions: matched.filter((pin) => pin.pinType === "question"),
    }
  }, [pins, trimmed, hasQuery])

  return {
    meetups,
    questions,
    places: hasQuery ? (places ?? []) : [],
    isLoading: hasQuery && (pinsLoading || placesLoading),
  }
}

export { useSearchResults }
export type { SearchResults }
