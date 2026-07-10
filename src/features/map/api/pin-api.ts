import { apiClient } from "@/lib/api/client"

import type { MapBounds, MapPinsResponse, PinType } from "@/features/map/api/pin-types"

interface GetMapPinsParams extends MapBounds {
  type?: PinType
}

// 지도 영역(bbox) 안의 핀을 조회한다. 조회 전용이라 CSRF 불필요 —
// apiClient가 withCredentials/401 refresh를 자동 처리한다.
// 도메인 API prefix 관례(/api/v1/*)를 따른다. BE 명세: api-reference.md §7.
async function getMapPins({ swLat, swLng, neLat, neLng, type }: GetMapPinsParams): Promise<MapPinsResponse> {
  const { data } = await apiClient.get<MapPinsResponse>("/api/v1/pins", {
    params: { swLat, swLng, neLat, neLng, ...(type ? { type } : {}) },
  })
  return data
}

export { getMapPins }
export type { GetMapPinsParams }
