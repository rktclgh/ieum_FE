"use client"

import { useQuery } from "@tanstack/react-query"

import { searchPlaces } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { roundCoordinate } from "@/features/map/lib/coordinate-precision"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

function usePlaceSearch(query: string, near: Coordinates | null) {
  const trimmed = query.trim()
  // 화면 고정 핀 화면은 팬할 때마다 near가 바뀐다. 격자에 스냅해 캐시 키를 안정화한다.
  const snapped = near ? roundCoordinate(near) : null

  return useQuery({
    queryKey: ["places", "search", trimmed, snapped],
    queryFn: () => searchPlaces({ query: trimmed, near: snapped ?? undefined }),
    enabled: trimmed.length > 0,
    meta: PUBLIC_QUERY_META,
    staleTime: 60_000,
  })
}

export { usePlaceSearch }
