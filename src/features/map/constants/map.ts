import type { Coordinates } from "@/features/map/hooks/use-geolocation"

// 위치 권한 거부/실패 시 기본 중심 좌표 (서울 시청)
const DEFAULT_MAP_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 }

const DEFAULT_MAP_ZOOM = 16

// 진입 시 내 위치를 이 시간까지 기다렸다가 지도를 마운트한다(명동→내위치 이동 모션 제거).
// 초과하면 기본 좌표로 먼저 띄우고, 이후 위치가 잡히면 조용히 재중심한다.
const MAP_LOCATION_WAIT_MS = 3500

// CARTO Positron — 흰색/회색 톤의 미니멀 베이스맵 (API 키 불필요)
const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const MAP_TILE_SUBDOMAINS = ["a", "b", "c", "d"]
const MAP_TILE_MAX_ZOOM = 20
const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

export {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_LOCATION_WAIT_MS,
  MAP_TILE_URL,
  MAP_TILE_SUBDOMAINS,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_ATTRIBUTION,
}
