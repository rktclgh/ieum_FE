"use client"

import L, { type Map as LeafletMap } from "leaflet"
import type { GeoJSONSource, Map as MaplibreMap, MapLayerMouseEvent } from "maplibre-gl"
import * as React from "react"

import type { MapPin } from "@/features/map/api/pin-types"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import {
  getClusterExpansionZoom,
  getClusterLeaves,
  getCoincidentClusterPins,
  type PinClusterIndex,
  type PinClusterItem,
} from "@/features/map/lib/cluster-index"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"
import { buildMarkerFeatureCollection } from "@/features/map/lib/marker-geojson"
import { easeOutCubic, lerpLatLng } from "@/features/map/lib/point-interpolation"
import { MarkerImageCache } from "@/features/map/lib/marker-image-cache"
import {
  MARKER_LAYER_SPECS,
  MARKER_SHADOW_LAYER_ID,
  MARKERS_SOURCE_ID,
  SELECTED_LOCATION_LAYER_ID,
  SELECTED_LOCATION_SOURCE_ID,
  USER_LOCATION_SOURCE_ID,
} from "@/features/map/lib/marker-layers"
import {
  PIN_MEETING_NO_IMAGE_ICON_ID,
  PIN_QUESTION_ICON_ID,
  registerStaticIcons,
} from "@/features/map/lib/marker-static-icons"
import { resolveFileUrl } from "@/lib/api/file-url"

// clustered-pins.tsx의 EXPAND_EDGE_PADDING과 동일 값.
const EXPAND_EDGE_PADDING = 24

interface UseMarkerLayersOptions {
  map: LeafletMap
  glMap: MaplibreMap | null
  items: PinClusterItem[]
  index: PinClusterIndex
  pins: MapPin[]
  livePosition?: Coordinates | null
  selectedPosition?: Coordinates | null
  topInset?: number
  bottomInset?: number
  onPinClick?: (pin: MapPin) => void
  onPinStackClick?: (pins: MapPin[]) => void
  onSelectedPositionClick?: () => void
}

const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection" as const, features: [] }

// 전역 모션 표준과 동일한 300ms(app/globals.css의 --motion-duration-base)를 써서
// 다른 지도 전환 애니메이션과 속도감이 어긋나지 않게 한다.
const LIVE_POSITION_TRANSITION_MS = 300

interface MarkerClickProperties {
  kind: "pin" | "cluster" | "stack"
  pinId?: number
  clusterId?: number
  stackPinIds?: number[]
}

function pointFeatureCollection(position: Coordinates | null | undefined) {
  if (!position) return EMPTY_FEATURE_COLLECTION
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [position.lng, position.lat] },
        properties: {},
      },
    ],
  }
}

// 핀/클러스터/내 위치/선택 위치를 MapLibre 네이티브 레이어(GeoJSON source + circle/symbol
// layer)로 그린다. Leaflet DOM 마커(예전 pin-marker.tsx/cluster-marker.tsx/clustered-pins.tsx +
// map-canvas.tsx의 selectedLocationIcon/userLocationIcon)를 전부 대체한다.
function useMarkerLayers(options: UseMarkerLayersOptions): void {
  const {
    map,
    glMap,
    items,
    index,
    pins,
    livePosition,
    selectedPosition,
    topInset = 0,
    bottomInset = 0,
    onPinClick,
    onPinStackClick,
    onSelectedPositionClick,
  } = options

  const imageCacheRef = React.useRef<MarkerImageCache | null>(null)
  // 썸네일 로딩이 끝나면 이 값을 올려 markers 소스를 다시 그린다(아래 effect 2).
  const [imageVersion, setImageVersion] = React.useState(0)
  // 내 위치 점이 매 GPS 갱신마다 즉시 스냅하지 않고 짧게 보간 이동하도록 진행 상태를 담는다.
  const liveAnimationRef = React.useRef<{ raf: number | null; current: Coordinates | null }>({
    raf: null,
    current: null,
  })

  // 최신 값/콜백을 ref로 받아 아래 effect들이 매 렌더 재구독하지 않게 한다
  // (map-canvas.tsx의 기존 관례: onClickRef 패턴).
  const mapRef = React.useRef(map)
  const pinsRef = React.useRef(pins)
  const indexRef = React.useRef(index)
  const insetsRef = React.useRef({ topInset, bottomInset })
  const onPinClickRef = React.useRef(onPinClick)
  const onPinStackClickRef = React.useRef(onPinStackClick)
  const onSelectedPositionClickRef = React.useRef(onSelectedPositionClick)

  React.useEffect(() => {
    mapRef.current = map
    pinsRef.current = pins
    indexRef.current = index
    insetsRef.current = { topInset, bottomInset }
    onPinClickRef.current = onPinClick
    onPinStackClickRef.current = onPinStackClick
    onSelectedPositionClickRef.current = onSelectedPositionClick
  })

  // 1) glMap 인스턴스가 생길 때(스타일 최초 로드) 소스·레이어·정적 아이콘·클릭 리스너를 만든다.
  //    이 코드베이스는 setStyle()을 호출하지 않으므로(vector-tile-layer.tsx 참고 — 스타일은
  //    L.maplibreGL({style}) 생성 시 한 번만 정해진다) glMap identity당 1회로 충분하다.
  React.useEffect(() => {
    if (!glMap) return

    let disposed = false
    imageCacheRef.current = new MarkerImageCache(glMap)

    if (!glMap.getSource(MARKERS_SOURCE_ID)) {
      glMap.addSource(MARKERS_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }
    if (!glMap.getSource(USER_LOCATION_SOURCE_ID)) {
      glMap.addSource(USER_LOCATION_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }
    if (!glMap.getSource(SELECTED_LOCATION_SOURCE_ID)) {
      glMap.addSource(SELECTED_LOCATION_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION })
    }

    for (const spec of MARKER_LAYER_SPECS) {
      if (!glMap.getLayer(spec.id)) glMap.addLayer(spec)
    }

    // 정적 아이콘이 등록되기 전에는 pin feature의 iconId가 아직 없는 이미지를 가리킨다 —
    // 등록이 끝나면 imageVersion을 올려 markers 소스를 다시 그리게 한다.
    void registerStaticIcons(glMap).then(() => {
      if (!disposed) setImageVersion((version) => version + 1)
    })

    const handleClusterExpand = (clusterId: number) => {
      const coincidentPins = getCoincidentClusterPins(indexRef.current, clusterId)
      if (coincidentPins) {
        onPinStackClickRef.current?.(coincidentPins)
        return
      }

      const leafletMap = mapRef.current
      if (!isLeafletMapActive(leafletMap)) return

      const leaves = getClusterLeaves(indexRef.current, clusterId)
      if (leaves.length === 0) return

      const expansionZoom = getClusterExpansionZoom(indexRef.current, clusterId)
      const bounds = L.latLngBounds(
        leaves.map((pin) => [pin.location.lat, pin.location.lng] as [number, number])
      )

      // glMap(MapLibre 인스턴스)을 직접 움직이면 안 된다 — @maplibre/maplibre-gl-leaflet은
      // Leaflet → GL 단방향 동기화만 하므로(getEvents가 Leaflet move/zoom만 구독), glMap을
      // 직접 fitBounds해도 Leaflet의 zoom/bounds가 안 바뀌어 usePinClusters가 재계산되지 않고
      // (클러스터가 개별 핀으로 영영 안 풀림), 다음 Leaflet 이벤트에 원래 위치로 되돌아간다.
      // 재중심(RecenterController)과 동일하게 반드시 Leaflet map으로 이동시킨다.
      const { topInset: top, bottomInset: bottom } = insetsRef.current
      leafletMap.flyToBounds(bounds, {
        paddingTopLeft: [EXPAND_EDGE_PADDING, top + EXPAND_EDGE_PADDING],
        paddingBottomRight: [EXPAND_EDGE_PADDING, bottom + EXPAND_EDGE_PADDING],
        maxZoom: expansionZoom,
      })
    }

    const handleMarkerClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const properties = feature?.properties as MarkerClickProperties | undefined
      if (!properties) return

      if (properties.kind === "pin" && properties.pinId !== undefined) {
        const pin = pinsRef.current.find((candidate) => candidate.pinId === properties.pinId)
        if (pin) onPinClickRef.current?.(pin)
        return
      }

      if (properties.kind === "cluster" && properties.clusterId !== undefined) {
        handleClusterExpand(properties.clusterId)
        return
      }

      if (properties.kind === "stack" && properties.stackPinIds) {
        const stackPins = properties.stackPinIds
          .map((pinId) => pinsRef.current.find((candidate) => candidate.pinId === pinId))
          .filter((pin): pin is MapPin => pin !== undefined)
        if (stackPins.length > 0) onPinStackClickRef.current?.(stackPins)
      }
    }

    const handleSelectedClick = () => onSelectedPositionClickRef.current?.()
    const setPointerCursor = () => {
      glMap.getCanvas().style.cursor = "pointer"
    }
    const resetCursor = () => {
      glMap.getCanvas().style.cursor = ""
    }

    glMap.on("click", MARKER_SHADOW_LAYER_ID, handleMarkerClick)
    glMap.on("click", SELECTED_LOCATION_LAYER_ID, handleSelectedClick)
    glMap.on("mouseenter", MARKER_SHADOW_LAYER_ID, setPointerCursor)
    glMap.on("mouseleave", MARKER_SHADOW_LAYER_ID, resetCursor)
    glMap.on("mouseenter", SELECTED_LOCATION_LAYER_ID, setPointerCursor)
    glMap.on("mouseleave", SELECTED_LOCATION_LAYER_ID, resetCursor)

    return () => {
      disposed = true
      glMap.off("click", MARKER_SHADOW_LAYER_ID, handleMarkerClick)
      glMap.off("click", SELECTED_LOCATION_LAYER_ID, handleSelectedClick)
      glMap.off("mouseenter", MARKER_SHADOW_LAYER_ID, setPointerCursor)
      glMap.off("mouseleave", MARKER_SHADOW_LAYER_ID, resetCursor)
      glMap.off("mouseenter", SELECTED_LOCATION_LAYER_ID, setPointerCursor)
      glMap.off("mouseleave", SELECTED_LOCATION_LAYER_ID, resetCursor)
    }
  }, [glMap])

  // 2) 핀/클러스터 데이터가 바뀔 때마다 markers 소스를 갱신한다. imageVersion이 오르면
  //    (정적 아이콘 등록 완료 또는 썸네일 로드 완료) iconId가 갱신된 데이터로 다시 흘려보낸다.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(MARKERS_SOURCE_ID)
    if (!source) return

    const cache = imageCacheRef.current
    const resolveIconId = (pin: MapPin): string => {
      if (pin.pinType === "question") return PIN_QUESTION_ICON_ID

      const thumbnailUrl = resolveFileUrl(pin.thumbnailUrl)
      if (!thumbnailUrl || !cache) return PIN_MEETING_NO_IMAGE_ICON_ID

      const cachedId = cache.getOrLoad(thumbnailUrl, () => setImageVersion((version) => version + 1))
      return cachedId ?? PIN_MEETING_NO_IMAGE_ICON_ID
    }

    source.setData(buildMarkerFeatureCollection(items, resolveIconId))
    // imageVersion은 값 자체를 안 쓰지만, 오를 때 위 setData를 다시 실행시키는 트리거다.
  }, [glMap, items, imageVersion])

  // 3) 내 위치 소스. setData는 보간 없이 즉시 스냅하므로(MapLibre GL 특성), 노이즈 섞인 GPS
  // 갱신이 그대로 순간이동으로 보여 떨림처럼 느껴진다. 매 갱신을 rAF로 짧게 보간해 이동시킨다.
  // 중간에 새 좌표가 도착하면(진행 중인 애니메이션을 취소하고) 그 시점의 화면상 위치(state.current)
  // 에서 새 목표로 이어서 보간한다 — 매번 예전 시작점으로 되돌아가 재생하면 오히려 더 떨어 보인다.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(USER_LOCATION_SOURCE_ID)
    if (!source) return

    const state = liveAnimationRef.current
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf)
      state.raf = null
    }

    if (!livePosition) {
      source.setData(EMPTY_FEATURE_COLLECTION)
      state.current = null
      return
    }

    const start = state.current
    if (!start) {
      // 최초 표시(진입 시점)는 애니메이션 없이 바로 스냅한다.
      source.setData(pointFeatureCollection(livePosition))
      state.current = livePosition
      return
    }

    const target = livePosition
    const startTime = performance.now()

    const step = (now: number) => {
      const t = Math.min((now - startTime) / LIVE_POSITION_TRANSITION_MS, 1)
      const point = lerpLatLng(start, target, easeOutCubic(t))
      source.setData(pointFeatureCollection(point))
      state.current = point
      state.raf = t < 1 ? requestAnimationFrame(step) : null
    }

    state.raf = requestAnimationFrame(step)

    return () => {
      if (state.raf !== null) {
        cancelAnimationFrame(state.raf)
        state.raf = null
      }
    }
  }, [glMap, livePosition])

  // 4) 선택 위치 소스.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(SELECTED_LOCATION_SOURCE_ID)
    if (!source) return
    source.setData(pointFeatureCollection(selectedPosition))
  }, [glMap, selectedPosition])
}

export { useMarkerLayers }
