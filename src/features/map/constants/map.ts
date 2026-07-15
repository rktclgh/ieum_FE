import type { Coordinates } from "@/features/map/hooks/use-geolocation"

// 위치 권한 거부/실패 시 기본 중심 좌표 (서울 시청)
const DEFAULT_MAP_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 }

const DEFAULT_MAP_ZOOM = 16

// 진입 시 내 위치를 이 시간까지 기다렸다가 지도를 마운트한다(명동→내위치 이동 모션 제거).
// 초과하면 기본 좌표로 먼저 띄우고, 이후 위치가 잡히면 조용히 재중심한다.
const MAP_LOCATION_WAIT_MS = 3500

// OpenFreeMap Positron — 흰색/회색 톤의 미니멀 벡터 베이스맵 (API 키 불필요).
// 벡터 타일이라 water/landcover/building/transportation을 레이어별로 색칠할 수 있다.
// provider 교체 시 이 URL만 바꾸면 된다(예: MapTiler 스타일 URL).
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"

// 지형 카테고리별로 덮어쓸 색상. 스타일 레이어의 source-layer 기준이라(레이어 id가 아니라)
// 여러 개로 쪼개진 도로 레이어 등도 한 번에 매칭된다. OpenMapTiles 스키마 기준.
// type: 'fill'이면 fill-color, 'line'이면 line-color 페인트 프로퍼티를 덮어쓴다.
const MAP_CATEGORY_COLORS: ReadonlyArray<{
  sourceLayers: readonly string[]
  type: "fill" | "line"
  color: string
}> = [
  { sourceLayers: ["water"], type: "fill", color: "#C2E0F6" }, // 물가
  { sourceLayers: ["landcover", "park"], type: "fill", color: "#C0E3A5" }, // 공원·풀·산
  { sourceLayers: ["building"], type: "fill", color: "#EFECF0" }, // 건물
  { sourceLayers: ["transportation"], type: "line", color: "#FFFFFF" }, // 도로
]

export {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_LOCATION_WAIT_MS,
  MAP_STYLE_URL,
  MAP_CATEGORY_COLORS,
}
