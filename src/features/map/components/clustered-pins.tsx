"use client"

import L from "leaflet"
import * as React from "react"
import { useMap } from "react-leaflet"

import type { MapPin } from "@/features/map/api/pin-types"
import { ClusterMarker } from "@/features/map/components/cluster-marker"
import { PinMarker } from "@/features/map/components/pin-marker"
import { usePinClusters } from "@/features/map/hooks/use-pin-clusters"
import {
  getClusterExpansionZoom,
  getClusterLeaves,
  getCoincidentClusterPins,
} from "@/features/map/lib/cluster-index"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"
import { useTranslation } from "@/lib/i18n/use-translation"

// flyToBounds 시 클러스터 핀이 화면 가장자리에 붙지 않도록 주는 여백(px).
const EXPAND_EDGE_PADDING = 24

interface ClusteredPinsProps {
  pins: MapPin[]
  onPinClick?: (pin: MapPin) => void
  /** 좌표가 겹쳐 확대해도 분리되지 않는 핀 더미를 탭했을 때 — 가로 캐러셀로 연다 */
  onPinStackClick?: (pins: MapPin[]) => void
  /** 상단 오버레이(검색바·카테고리 칩)에 가려지는 높이(px) — 확대 정렬 시 보이는 영역 정중앙 계산 */
  topInset?: number
  /** 하단 오버레이(탭바·FAB)에 가려지는 높이(px) */
  bottomInset?: number
}

// 현재 zoom/영역 기준으로 핀을 클러스터(다크 원+개수), 좌표가 겹친 핀 더미, 또는 개별 핀으로 렌더한다.
// 멀티핀 탭 → 묶인 핀들의 bounds를 보이는 영역 정중앙에 맞추고, 분리되는 zoom(expansionZoom)까지 확대.
// 단, 묶인 핀이 전부 같은 좌표면 확대해도 영영 갈라지지 않으므로 대신 가로 캐러셀로 넘긴다.
// MapContainer 하위에서만 렌더해야 한다(useMap 사용).
function ClusteredPins({
  pins,
  onPinClick,
  onPinStackClick,
  topInset = 0,
  bottomInset = 0,
}: ClusteredPinsProps) {
  const map = useMap()
  const { messages } = useTranslation()
  // 해결된 질문은 지도와 클러스터 모두에서 제외한다.
  const visiblePins = React.useMemo(() => pins.filter((pin) => !pin.resolved), [pins])
  const { items, index } = usePinClusters(visiblePins)

  // onPinStackClick이 매 렌더 새 함수여도 handleClusterClick 정체성이 흔들리지 않게 ref로 받는다.
  const onPinStackClickRef = React.useRef(onPinStackClick)
  React.useEffect(() => {
    onPinStackClickRef.current = onPinStackClick
  })

  const handleClusterClick = React.useCallback(
    (clusterId: number) => {
      if (!isLeafletMapActive(map)) return

      // 확대해도 갈라지지 않는 더미는 확대가 아무 도움이 안 된다 — 바로 캐러셀로 연다.
      const coincidentPins = getCoincidentClusterPins(index, clusterId)
      if (coincidentPins) {
        onPinStackClickRef.current?.(coincidentPins)
        return
      }

      const leaves = getClusterLeaves(index, clusterId)
      if (leaves.length === 0) return

      const expansionZoom = getClusterExpansionZoom(index, clusterId)
      const bounds = L.latLngBounds(
        leaves.map((pin) => [pin.location.lat, pin.location.lng] as [number, number])
      )

      // 헤더·탭바에 가려지는 만큼 상/하 패딩을 더해, 묶인 핀들이 "보이는" 영역 정중앙에 오도록 이동.
      // maxZoom을 expansionZoom으로 제한해 딱 풀리는 단계까지만 확대한다.
      map.flyToBounds(bounds, {
        paddingTopLeft: [EXPAND_EDGE_PADDING, topInset + EXPAND_EDGE_PADDING],
        paddingBottomRight: [EXPAND_EDGE_PADDING, bottomInset + EXPAND_EDGE_PADDING],
        maxZoom: expansionZoom,
      })
    },
    [index, map, topInset, bottomInset]
  )

  // 지도가 해제되는 중(StrictMode 재마운트·HMR)에는 mapPane이 사라진다. 이 시점에 react-leaflet
  // Marker를 마운트하면 leaflet Marker._initIcon이 getPane().appendChild에서 터진다.
  // VectorTileLayer·클러스터 클릭과 동일하게 map이 살아 있을 때만 마커를 렌더한다.
  if (!isLeafletMapActive(map)) {
    return null
  }

  return (
    <>
      {items.map((item) => {
        if (item.kind === "cluster") {
          return (
            <ClusterMarker
              key={`cluster-${item.clusterId}`}
              count={item.count}
              lat={item.lat}
              lng={item.lng}
              label={messages.home.clusterMarkerLabel(item.count)}
              onClick={() => handleClusterClick(item.clusterId)}
            />
          )
        }

        // 좌표가 겹친 더미. supercluster가 손을 떼는 고배율에서도 나타나므로 클러스터와
        // 같은 다크 원으로 그리고, 탭하면 확대 없이 곧장 캐러셀을 연다.
        if (item.kind === "stack") {
          return (
            <ClusterMarker
              key={`stack-${item.pins[0].pinId}`}
              count={item.pins.length}
              lat={item.lat}
              lng={item.lng}
              label={messages.home.pinStackMarkerLabel(item.pins.length)}
              onClick={() => onPinStackClickRef.current?.(item.pins)}
            />
          )
        }

        return <PinMarker key={item.pin.pinId} pin={item.pin} onClick={onPinClick} />
      })}
    </>
  )
}

export { ClusteredPins }
