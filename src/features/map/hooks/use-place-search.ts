"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

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
    // 지도를 팬하면 좌표가 바뀌어 키가 갈리는데, 그때마다 data가 undefined로 떨어지면
    // 하단 목록이 통째로 사라졌다 나타난다. 새 결과가 올 때까지 이전 목록을 유지한다.
    placeholderData: keepPreviousData,
  })
}

export { usePlaceSearch }
