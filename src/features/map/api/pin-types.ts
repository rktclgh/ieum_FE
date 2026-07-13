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

// FE에서 다루는 핀 뷰모델. BE raw 응답을 pin-api 어댑터로 이 형태에 맞춘다.
interface MapPin {
  pinId: number
  pinType: PinType
  /** 핀이 가리키는 원본 엔티티(모임/질문) ID — 핀 클릭 → 상세 이동에 사용 */
  targetId: number
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

// BE §7 원본 응답 형태: 배열 래퍼가 `items`, 좌표가 `latitude/longitude`.
interface RawMapPin {
  pinId: number
  pinType: PinType
  targetId: number
  title: string
  thumbnailUrl: string | null
  location: { latitude: number; longitude: number }
  mine: boolean
  createdAt: string
}

interface RawMapPinsResponse {
  items: RawMapPin[]
  truncated: boolean
}

export type { PinType, MapBounds, MapPin, MapPinsResponse, RawMapPin, RawMapPinsResponse }
