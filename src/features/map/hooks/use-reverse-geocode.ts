"use client"

import { useQuery } from "@tanstack/react-query"

import { reverseGeocode } from "@/features/map/api/reverse-geocode-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

// 좌표를 소수점 5자리(약 1m)로 반올림한다. 거의 같은 지점을 연타로 클릭해도
// 같은 캐시 키에 맞도록 하여 역지오코딩 재호출을 줄인다.
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

function useReverseGeocode(position: Coordinates | null) {
  const lat = position ? roundCoord(position.lat) : null
  const lng = position ? roundCoord(position.lng) : null

  return useQuery({
    queryKey: ["places", "reverse-geocode", lat, lng],
    queryFn: () => reverseGeocode(lat!, lng!),
    enabled: lat !== null && lng !== null,
    meta: PUBLIC_QUERY_META,
    // 좌표→주소는 불변이므로 세션 내 재조회하지 않는다.
    staleTime: Infinity,
  })
}

export { useReverseGeocode }
