import { apiClient } from "@/lib/api/client"

import { adaptPin } from "@/features/map/api/pin-api"
import type { MapPin, PinType, RawMapPin } from "@/features/map/api/pin-types"

interface PinListParams {
  type?: PinType
  cursor?: string | null
  size?: number
}

// BE §7 원본 페이지: items(RawMapPin·latitude/longitude) + nextCursor.
interface RawPinListPage {
  items: RawMapPin[]
  nextCursor: string | null
}

interface PinListPage {
  pins: MapPin[]
  nextCursor: string | null
}

// 전체 핀 목록(커서 페이지). 지도 바운즈와 무관 — 검색 오버레이의 제목 매칭 대상.
// 조회 전용이라 CSRF 불필요. 좌표 없는 핀은 (0,0) 유령 핀 방지 위해 제외한다.
async function getPinList({ type, cursor, size = 50 }: PinListParams): Promise<PinListPage> {
  const { data } = await apiClient.get<RawPinListPage>("/api/v1/pins/list", {
    params: {
      ...(type ? { type } : {}),
      ...(cursor ? { cursor } : {}),
      size,
    },
  })
  return {
    pins: (data?.items ?? []).filter((item) => item.location).map(adaptPin),
    nextCursor: data?.nextCursor ?? null,
  }
}

export { getPinList }
export type { PinListParams, PinListPage }
