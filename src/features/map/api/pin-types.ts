// 홈 지도에 오버레이하는 백엔드 핀(질문/모임) 계약.
// BE 명세: ieum_BE/docs/api-reference.md §7(핀/지도)

type PinType = "question" | "meeting"

// 지도 현재 영역(남서/북동 모서리). Leaflet bounds에서 계산한다.
interface MapBounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

interface MapPin {
  pinId: number
  pinType: PinType
  title: string
  thumbnailUrl: string | null
  location: { lat: number; lng: number }
  mine: boolean
  createdAt: string
}

// truncated: 영역 내 핀이 너무 많아 일부만 내려온 경우 true → FE가 "더 확대" 안내.
interface MapPinsResponse {
  pins: MapPin[]
  truncated: boolean
}

export type { PinType, MapBounds, MapPin, MapPinsResponse }
