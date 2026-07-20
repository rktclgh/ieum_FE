// 홈 지도 핀 클러스터링 순수 로직 (React/leaflet 비의존).
// supercluster로 근거리 핀을 묶고, "묶임/풀림" 및 멀티핀 탭 시 분리 확대에 필요한 값을 노출한다.
// 좌표 변환: 우리 MapPin은 {lat,lng}, supercluster는 GeoJSON [lng,lat] 순서라 여기서 왕복 변환한다.

import Supercluster from "supercluster"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"

// 클러스터 반경(px). 이 화면 픽셀 거리 안의 핀이 하나로 묶인다. 크면 더 잘 묶이고, 작으면 덜 묶인다.
const CLUSTER_RADIUS = 56
// 이 zoom을 넘으면 더 이상 묶지 않는다(항상 개별 핀). 티어드롭 핀(56px)이 확대 시 겹치지 않게 하는 상한.
const CLUSTER_MAX_ZOOM = 17
// 좌표가 "같다"고 볼 허용 오차(도). 약 0.11m — 같은 장소로 등록된 핀을 하나로 본다.
// 이 안에 있는 핀들은 아무리 확대해도 화면에서 분리되지 않으므로 줌인 대신 캐러셀로 열어야 한다.
const COINCIDENT_EPSILON_DEG = 1e-6
// 좌표 그룹 키의 소수 자릿수. COINCIDENT_EPSILON_DEG(1e-6)와 같은 해상도.
const COINCIDENT_KEY_PRECISION = 6

// supercluster 포인트 피처의 properties: 원본 MapPin을 그대로 실어 나른다(개별 핀 렌더에 필요).
interface PinPointProps {
  pin: MapPin
}

// 지도에 그릴 항목 — 묶인 클러스터(다크 원 + 개수), 좌표가 겹친 핀 더미, 또는 개별 핀.
//
// "stack"은 supercluster가 아니라 우리가 직접 묶는다. supercluster는 maxZoom(=CLUSTER_MAX_ZOOM)
// 위에서 클러스터링을 멈추는데, 좌표가 같은 핀은 그 배율에서도 여전히 완전히 겹쳐 렌더되므로
// 맨 위 하나 말고는 누를 수가 없다. 좌표 동일 그룹만 zoom과 무관하게 따로 묶어 그 사각지대를 막는다.
type PinClusterItem =
  | { kind: "cluster"; clusterId: number; count: number; lat: number; lng: number }
  | { kind: "stack"; pins: MapPin[]; lat: number; lng: number }
  | { kind: "pin"; pin: MapPin; lat: number; lng: number }

type PinClusterIndex = Supercluster<PinPointProps>

// 핀 목록으로 클러스터 인덱스를 만든다. pins가 바뀔 때마다 새로 만든다(hook에서 useMemo).
function createPinClusterIndex(pins: MapPin[]): PinClusterIndex {
  const index = new Supercluster<PinPointProps>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
  })

  index.load(
    pins.map((pin) => ({
      type: "Feature" as const,
      properties: { pin },
      geometry: {
        type: "Point" as const,
        coordinates: [pin.location.lng, pin.location.lat],
      },
    }))
  )

  return index
}

// 현재 보이는 영역(bbox)과 zoom에 대한 클러스터/개별 핀 목록.
// supercluster bbox는 [westLng, southLat, eastLng, northLat], zoom은 정수라야 안정적이라 반올림한다.
function getPinClusters(
  index: PinClusterIndex,
  bounds: MapBounds,
  zoom: number
): PinClusterItem[] {
  const bbox: [number, number, number, number] = [
    bounds.swLng,
    bounds.swLat,
    bounds.neLng,
    bounds.neLat,
  ]

  const items: PinClusterItem[] = []
  // 좌표 키 → items 내 위치. 같은 키의 두 번째 핀을 만나면 그 자리의 "pin"을 "stack"으로 승격한다.
  // 한 번 순회로 등장 순서를 유지한다.
  const stackSlotByKey = new Map<string, number>()

  for (const feature of index.getClusters(bbox, Math.round(zoom))) {
    const [lng, lat] = feature.geometry.coordinates
    const props = feature.properties

    if ("cluster" in props && props.cluster) {
      items.push({
        kind: "cluster",
        clusterId: props.cluster_id,
        count: props.point_count,
        lat,
        lng,
      })
      continue
    }

    const pin = (props as PinPointProps).pin
    const key = toCoincidentKey(lat, lng)
    const slot = stackSlotByKey.get(key)

    if (slot === undefined) {
      stackSlotByKey.set(key, items.length)
      items.push({ kind: "pin", pin, lat, lng })
      continue
    }

    const existing = items[slot]
    items[slot] =
      existing.kind === "stack"
        ? { ...existing, pins: [...existing.pins, pin] }
        : { kind: "stack", pins: [(existing as { pin: MapPin }).pin, pin], lat, lng }
  }

  return items
}

// 좌표 그룹 키. 같은 지점에 등록된 핀들은 같은 문자열로 떨어진다.
function toCoincidentKey(lat: number, lng: number): string {
  return `${lat.toFixed(COINCIDENT_KEY_PRECISION)},${lng.toFixed(COINCIDENT_KEY_PRECISION)}`
}

// 멀티핀 탭 시: 이 클러스터가 개별 핀으로 "풀리는" 정확한 zoom 단계.
function getClusterExpansionZoom(index: PinClusterIndex, clusterId: number): number {
  return index.getClusterExpansionZoom(clusterId)
}

// 멀티핀 탭 시: 클러스터에 묶인 모든 원본 핀(bounds 계산·정렬용).
function getClusterLeaves(index: PinClusterIndex, clusterId: number): MapPin[] {
  return index.getLeaves(clusterId, Infinity).map((feature) => feature.properties.pin)
}

// 클러스터에 묶인 핀들이 전부 같은 좌표라 확대해도 분리되지 않으면 그 핀 목록을, 아니면 null을 준다.
// 호출부는 null일 때만 기존대로 확대하고, 목록을 받으면 캐러셀로 연다.
function getCoincidentClusterPins(index: PinClusterIndex, clusterId: number): MapPin[] | null {
  const pins = getClusterLeaves(index, clusterId)
  if (pins.length === 0) return null

  // 한 번의 순회로 min/max를 구한다. Math.max(...array)는 클러스터가 커지면(수만 개)
  // 인자 개수 제한에 걸려 RangeError로 터지고, map으로 중간 배열도 두 개 만들게 된다.
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLng = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY

  for (const pin of pins) {
    const { lat, lng } = pin.location
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  if (maxLat - minLat > COINCIDENT_EPSILON_DEG || maxLng - minLng > COINCIDENT_EPSILON_DEG) {
    return null
  }
  return pins
}

export {
  createPinClusterIndex,
  getPinClusters,
  getClusterExpansionZoom,
  getClusterLeaves,
  getCoincidentClusterPins,
  CLUSTER_MAX_ZOOM,
}
export type { PinClusterIndex, PinClusterItem }
