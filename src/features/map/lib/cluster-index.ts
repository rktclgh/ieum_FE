// 홈 지도 핀 클러스터링 순수 로직 (React/leaflet 비의존).
// supercluster로 근거리 핀을 묶고, "묶임/풀림" 및 멀티핀 탭 시 분리 확대에 필요한 값을 노출한다.
// 좌표 변환: 우리 MapPin은 {lat,lng}, supercluster는 GeoJSON [lng,lat] 순서라 여기서 왕복 변환한다.

import Supercluster from "supercluster"

import type { MapBounds, MapPin } from "@/features/map/api/pin-types"

// 클러스터 반경(px). 이 화면 픽셀 거리 안의 핀이 하나로 묶인다. 크면 더 잘 묶이고, 작으면 덜 묶인다.
const CLUSTER_RADIUS = 56
// 이 zoom을 넘으면 더 이상 묶지 않는다(항상 개별 핀). 티어드롭 핀(56px)이 확대 시 겹치지 않게 하는 상한.
const CLUSTER_MAX_ZOOM = 17

// supercluster 포인트 피처의 properties: 원본 MapPin을 그대로 실어 나른다(개별 핀 렌더에 필요).
interface PinPointProps {
  pin: MapPin
}

// 지도에 그릴 항목 — 묶인 클러스터(다크 원 + 개수) 또는 개별 핀.
type PinClusterItem =
  | { kind: "cluster"; clusterId: number; count: number; lat: number; lng: number }
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

  return index.getClusters(bbox, Math.round(zoom)).map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const props = feature.properties

    if ("cluster" in props && props.cluster) {
      return {
        kind: "cluster",
        clusterId: props.cluster_id,
        count: props.point_count,
        lat,
        lng,
      }
    }

    return { kind: "pin", pin: (props as PinPointProps).pin, lat, lng }
  })
}

// 멀티핀 탭 시: 이 클러스터가 개별 핀으로 "풀리는" 정확한 zoom 단계.
function getClusterExpansionZoom(index: PinClusterIndex, clusterId: number): number {
  return index.getClusterExpansionZoom(clusterId)
}

// 멀티핀 탭 시: 클러스터에 묶인 모든 원본 핀(bounds 계산·정렬용).
function getClusterLeaves(index: PinClusterIndex, clusterId: number): MapPin[] {
  return index.getLeaves(clusterId, Infinity).map((feature) => feature.properties.pin)
}

export {
  createPinClusterIndex,
  getPinClusters,
  getClusterExpansionZoom,
  getClusterLeaves,
  CLUSTER_MAX_ZOOM,
}
export type { PinClusterIndex, PinClusterItem }
