"use client"

import type { GeoJSONSource, LngLatBoundsLike, Map as MaplibreMap, MapLayerMouseEvent } from "maplibre-gl"
import { LngLatBounds } from "maplibre-gl"
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
import { buildMarkerFeatureCollection } from "@/features/map/lib/marker-geojson"
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

  // 최신 값/콜백을 ref로 받아 아래 effect들이 매 렌더 재구독하지 않게 한다
  // (map-canvas.tsx의 기존 관례: onClickRef 패턴).
  const pinsRef = React.useRef(pins)
  const indexRef = React.useRef(index)
  const insetsRef = React.useRef({ topInset, bottomInset })
  const onPinClickRef = React.useRef(onPinClick)
  const onPinStackClickRef = React.useRef(onPinStackClick)
  const onSelectedPositionClickRef = React.useRef(onSelectedPositionClick)

  React.useEffect(() => {
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

      const leaves = getClusterLeaves(indexRef.current, clusterId)
      if (leaves.length === 0) return

      const expansionZoom = getClusterExpansionZoom(indexRef.current, clusterId)
      const bounds = leaves.reduce(
        (acc, pin) => acc.extend([pin.location.lng, pin.location.lat]),
        new LngLatBounds(
          [leaves[0].location.lng, leaves[0].location.lat],
          [leaves[0].location.lng, leaves[0].location.lat]
        )
      )

      const { topInset: top, bottomInset: bottom } = insetsRef.current
      glMap.fitBounds(bounds as LngLatBoundsLike, {
        padding: {
          top: top + EXPAND_EDGE_PADDING,
          bottom: bottom + EXPAND_EDGE_PADDING,
          left: EXPAND_EDGE_PADDING,
          right: EXPAND_EDGE_PADDING,
        },
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

  // 3) 내 위치 소스.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(USER_LOCATION_SOURCE_ID)
    if (!source) return
    source.setData(pointFeatureCollection(livePosition))
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
