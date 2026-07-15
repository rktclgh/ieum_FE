"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"

import type { MapPin } from "@/features/map/api/pin-types"
import {
  createPinClusterIndex,
  getPinClusters,
  type PinClusterIndex,
  type PinClusterItem,
} from "@/features/map/lib/cluster-index"

// 현재 지도 영역/zoom에 맞는 클러스터·개별 핀 목록을 계산한다.
// 인덱스는 pins가 바뀔 때만 다시 만들고(useMemo), 목록은 index/영역/zoom이 바뀌면 렌더 중 파생한다.
// 영역·zoom 변화는 moveend/zoomend에서 viewVersion(nonce)을 올려 재계산을 트리거한다
// (setState는 이벤트 콜백에서만 호출 — effect 내 setState 지양 규칙 준수).
// MapContainer 하위(useMap 사용 가능)에서만 호출해야 한다.
function usePinClusters(pins: MapPin[]): {
  items: PinClusterItem[]
  index: PinClusterIndex
} {
  const map = useMap()
  const index = React.useMemo(() => createPinClusterIndex(pins), [pins])
  const [viewVersion, setViewVersion] = React.useState(0)

  useMapEvents({
    moveend: () => setViewVersion((version) => version + 1),
    zoomend: () => setViewVersion((version) => version + 1),
  })

  const items = React.useMemo(() => {
    void viewVersion // 지도 이동/줌 시 재계산을 강제하는 트리거
    const bounds = map.getBounds()
    return getPinClusters(
      index,
      {
        swLat: bounds.getSouth(),
        swLng: bounds.getWest(),
        neLat: bounds.getNorth(),
        neLng: bounds.getEast(),
      },
      map.getZoom()
    )
  }, [index, map, viewVersion])

  return { items, index }
}

export { usePinClusters }
