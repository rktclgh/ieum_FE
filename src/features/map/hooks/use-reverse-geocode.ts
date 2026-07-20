"use client"

import { useQuery } from "@tanstack/react-query"

import { reverseGeocode } from "@/features/map/api/reverse-geocode-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { roundCoordinateValue } from "@/features/map/lib/coordinate-precision"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

function useReverseGeocode(position: Coordinates | null) {
  const lat = position ? roundCoordinateValue(position.lat) : null
  const lng = position ? roundCoordinateValue(position.lng) : null

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
