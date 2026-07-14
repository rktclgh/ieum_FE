"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getMapPins } from "@/features/map/api/pin-api"
import type { MapBounds, PinType } from "@/features/map/api/pin-types"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

// bounds가 null(지도 첫 mount 전)이면 조회를 건너뛴다.
// 지도를 움직일 때마다 bounds가 바뀌므로 keepPreviousData로 이전 핀을 유지해 깜빡임을 막는다.
function useMapPins(bounds: MapBounds | null, type?: PinType) {
  return useQuery({
    queryKey: ["pins", bounds, type ?? null],
    queryFn: () => getMapPins({ ...(bounds as MapBounds), type }),
    enabled: bounds !== null,
    meta: PUBLIC_QUERY_META,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export { useMapPins }
