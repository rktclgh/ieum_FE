import { apiClient } from "@/lib/api/client"

import type {
  MapBounds,
  MapPin,
  MapPinsResponse,
  PinType,
  RawMapPin,
  RawMapPinsResponse,
} from "@/features/map/api/pin-types"

interface GetMapPinsParams extends MapBounds {
  type?: PinType
}

// BE §7 원본 핀(items·latitude/longitude)을 FE 뷰모델(pins·lat/lng)로 매핑한다.
function adaptPin(raw: RawMapPin): MapPin {
  return {
    pinId: raw.pinId,
    pinType: raw.pinType,
    targetId: raw.targetId,
    title: raw.title,
    thumbnailUrl: raw.thumbnailUrl,
    location: { lat: raw.location.latitude, lng: raw.location.longitude },
    mine: raw.mine,
    createdAt: raw.createdAt,
  }
}

// 지도 영역(bbox) 안의 핀을 조회한다. 조회 전용이라 CSRF 불필요 —
// apiClient가 withCredentials/401 refresh를 자동 처리한다.
// 도메인 API prefix 관례(/api/v1/*)를 따른다. BE 명세: api-reference.md §7.
// BE는 { items:[{...,location:{latitude,longitude},targetId}], truncated } 형태라 어댑터로 변환한다.
async function getMapPins({ swLat, swLng, neLat, neLng, type }: GetMapPinsParams): Promise<MapPinsResponse> {
  const { data } = await apiClient.get<RawMapPinsResponse>("/api/v1/pins", {
    params: { swLat, swLng, neLat, neLng, ...(type ? { type } : {}) },
  })
  // 방어: 응답/좌표 누락 시 크래시·(0,0) 유령 핀을 막기 위해 좌표 있는 핀만 매핑한다.
  return {
    pins: (data?.items ?? []).filter((item) => item.location).map(adaptPin),
    truncated: data?.truncated ?? false,
  }
}

export { getMapPins, adaptPin }
export type { GetMapPinsParams }
