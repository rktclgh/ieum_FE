"use client"

import * as React from "react"
import { useMap, useMapEvents } from "react-leaflet"

import type { MapPin } from "@/features/map/api/pin-types"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"
import {
  createPinClusterIndex,
  getPinClusters,
  type PinClusterIndex,
  type PinClusterItem,
} from "@/features/map/lib/cluster-index"

// 클러스터 조회 시 뷰포트 경계를 넓힐 비율(폭 대비). 가장자리 마커 깜빡임 완화용.
const BOUNDS_PADDING_RATIO = 0.2

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
    moveend: () => {
      if (isLeafletMapActive(map)) setViewVersion((version) => version + 1)
    },
    zoomend: () => {
      if (isLeafletMapActive(map)) setViewVersion((version) => version + 1)
    },
  })

  const items = React.useMemo(() => {
    void viewVersion // 지도 이동/줌 시 재계산을 강제하는 트리거
    if (!isLeafletMapActive(map)) return []

    const bounds = map.getBounds()
    const south = bounds.getSouth()
    const west = bounds.getWest()
    const north = bounds.getNorth()
    const east = bounds.getEast()
    // 뷰포트 폭의 일정 비율만큼 경계를 넓혀 조회한다. pan 직후(keepPreviousData 전환 구간)
    // 화면 가장자리의 마커가 사라졌다 다시 나타나는 깜빡임을 줄인다. 화면 밖 마커는 Leaflet이 컬링한다.
    const latPad = (north - south) * BOUNDS_PADDING_RATIO
    const lngPad = (east - west) * BOUNDS_PADDING_RATIO
    return getPinClusters(
      index,
      {
        swLat: south - latPad,
        swLng: west - lngPad,
        neLat: north + latPad,
        neLng: east + lngPad,
      },
      map.getZoom()
    )
  }, [index, map, viewVersion])

  return { items, index }
}

export { usePinClusters }
