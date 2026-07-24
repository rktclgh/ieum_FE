// PinClusterItem[](use-pin-clusters.ts의 결과)을 MapLibre GeoJSON source에 바로 넣을 수 있는
// FeatureCollection으로 바꾼다. 썸네일 로딩 상태를 아는 쪽은 이미지 캐시(훅)이므로, 이 함수는
// iconId 결정을 resolveIconId로 주입받아 순수 함수로 남는다.

import type { MapPin } from "@/features/map/api/pin-types"
import type { PinClusterItem } from "@/features/map/lib/cluster-index"

interface MarkerFeatureProperties {
  kind: "pin" | "cluster" | "stack"
  pinId?: number
  iconId?: string
  clusterId?: number
  count?: number
  countLabel?: string
  stackPinIds?: number[]
}

interface MarkerFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: MarkerFeatureProperties
}

interface MarkerFeatureCollection {
  type: "FeatureCollection"
  features: MarkerFeature[]
}

// 클러스터/스택 원 안의 숫자 표기. 4자리부터는 축약(999+) — 기존 cluster-marker.tsx와 동일 규칙.
function formatCount(count: number): string {
  return count > 999 ? "999+" : String(count)
}

function buildMarkerFeatureCollection(
  items: PinClusterItem[],
  resolveIconId: (pin: MapPin) => string
): MarkerFeatureCollection {
  const features: MarkerFeature[] = items.map((item) => {
    if (item.kind === "cluster") {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.lng, item.lat] },
        properties: {
          kind: "cluster",
          clusterId: item.clusterId,
          count: item.count,
          countLabel: formatCount(item.count),
        },
      }
    }

    if (item.kind === "stack") {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [item.lng, item.lat] },
        properties: {
          kind: "stack",
          count: item.pins.length,
          countLabel: formatCount(item.pins.length),
          stackPinIds: item.pins.map((pin) => pin.pinId),
        },
      }
    }

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lng, item.lat] },
      properties: {
        kind: "pin",
        pinId: item.pin.pinId,
        iconId: resolveIconId(item.pin),
      },
    }
  })

  return { type: "FeatureCollection", features }
}

export { buildMarkerFeatureCollection, formatCount }
export type { MarkerFeature, MarkerFeatureCollection, MarkerFeatureProperties }
