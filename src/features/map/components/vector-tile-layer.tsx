"use client"

import L from "leaflet"
import type { ErrorEvent as MaplibreErrorEvent, Map as MaplibreMap } from "maplibre-gl"
import * as React from "react"
import { useMap } from "react-leaflet"
import "maplibre-gl/dist/maplibre-gl.css"
import "@maplibre/maplibre-gl-leaflet"

import { MAP_CATEGORY_COLORS } from "@/features/map/constants/map"
import { isLeafletMapActive } from "@/features/map/lib/leaflet-map-lifecycle"
import { applyLabelLanguage, loadMapStyle } from "@/features/map/lib/map-style"
import { isTransientTileRequestError } from "@/features/map/lib/map-tile-error"
import { useLanguageStore } from "@/lib/i18n/store"

// 스타일의 각 레이어를 source-layer 기준으로 매칭해 지정 색으로 덮어쓴다.
// (레이어 id가 아니라 source-layer 기준이라, 여러 개로 쪼개진 도로 레이어 등도 한 번에 처리된다.)
function applyCategoryColors(map: MaplibreMap) {
  const layers = map.getStyle()?.layers
  if (!layers) return

  for (const layer of layers) {
    // background 등 일부 레이어에는 source-layer가 없다.
    const sourceLayer = (layer as { "source-layer"?: string })["source-layer"]
    if (!sourceLayer) continue

    const category = MAP_CATEGORY_COLORS.find((c) => c.sourceLayers.includes(sourceLayer))
    if (!category) continue

    const paintProperty = category.type === "fill" ? "fill-color" : "line-color"
    // 레이어 type과 페인트 프로퍼티가 맞지 않으면 MapLibre가 예외를 던지므로 방어한다.
    if (layer.type !== category.type) continue

    // setPaintProperty는 styledata 이벤트를 다시 발생시킨다. 이미 목표 색이면 건너뛰어야
    // styledata → setPaintProperty → styledata 재귀 루프(불필요한 스타일 재계산)를 막는다.
    if (map.getPaintProperty(layer.id, paintProperty) === category.color) continue

    map.setPaintProperty(layer.id, paintProperty, category.color)
  }
}

// MapLibre는 error 리스너가 하나도 없을 때만 console.error로 폴백 출력한다(Evented#fire).
// 즉 리스너를 다는 순간 그 폴백이 꺼지므로, 걸러낼 것만 무시하고 나머지는 여기서 직접 다시 남긴다.
function handleMapError(event: MaplibreErrorEvent) {
  if (isTransientTileRequestError(event.error)) return

  console.error("지도 렌더링 오류", event.error)
}

// 기존 Leaflet 지도 위에 OpenFreeMap 벡터 타일 레이어를 얹고, 지형 카테고리별로 색을 덮어쓴다.
// 렌더 출력은 없다. 마커·실시간 위치·재중심 등 다른 Leaflet 로직과 독립적으로 동작한다.
function VectorTileLayer({
  onReady,
  onMapReady,
}: {
  onReady?: () => void
  onMapReady?: (map: MaplibreMap | null) => void
}) {
  const map = useMap()
  const language = useLanguageStore((state) => state.language)

  const [glMap, setGlMap] = React.useState<MaplibreMap | null>(null)

  // 부모가 매 렌더 새 함수를 넘겨도 아래 effect가 재실행되지 않도록 ref에 담는다.
  const onReadyRef = React.useRef(onReady)
  React.useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  const onMapReadyRef = React.useRef(onMapReady)
  React.useEffect(() => {
    onMapReadyRef.current = onMapReady
  }, [onMapReady])

  React.useEffect(() => {
    let layer: L.Layer | null = null
    let instance: MaplibreMap | null = null
    let cancelled = false

    // MapContainer가 해제되는 중이면 Leaflet의 pane도 함께 사라진다. 이 시점에 레이어를 붙이면
    // maplibre-gl-leaflet 내부에서 제거된 mapPane을 읽어 예외가 나므로, 현재 map이 살아 있을 때만 시작한다.
    if (!isLeafletMapActive(map)) return

    // 스타일은 언어가 바뀔 때마다 다시 받지 않는다(타일까지 새로 그려진다). 최초 1회만 쓰므로
    // 구독 대신 getState로 읽는다 — 이후 언어 변경은 아래 effect가 text-field만 갱신한다.
    // glyphs URL을 자체 호스팅으로 갈아끼우려면 스타일 객체를 미리 받아 손봐야 해서 비동기다.
    // 그 사이 언마운트되면 이미 사라진 지도에 레이어를 붙이게 되므로 cancelled/활성 여부로 막는다.
    void loadMapStyle(useLanguageStore.getState().language)
      .then((style) => {
        // 스타일을 받는 사이 언마운트됐거나 map이 해제 중이면 죽은 pane에 붙이지 않는다.
        if (cancelled || !isLeafletMapActive(map)) return

        const glLayer = L.maplibreGL({ style })
        layer = glLayer
        glLayer.addTo(map)

        // 초기화 지연 등으로 내부 MapLibre 인스턴스가 아직 없을 수 있어 존재를 확인하고 바인딩한다.
        instance = glLayer.getMaplibreMap()
        if (!instance) return

        // error 핸들러는 setGlMap을 거치는 아래 effect가 아니라 여기서 바로 붙인다.
        // 상태 반영에 렌더 한 틱이 걸리는데, 첫 타일 요청은 그 전에 시작되기 때문이다.
        instance.on("error", handleMapError)
        setGlMap(instance)
        onMapReadyRef.current?.(instance)
      })
      .catch((error: unknown) => {
        // 스타일을 못 받으면 지도는 마커만 뜬 빈 배경이 된다. 조용히 죽지 않도록 남긴다.
        console.error("지도 스타일 로드 실패", error)
      })

    return () => {
      cancelled = true
      instance?.off("error", handleMapError)
      setGlMap(null)
      onMapReadyRef.current?.(null)
      // 부모 MapContainer가 먼저 제거한 경우에는 이미 layer가 빠져 있다. 해제 중인 map에
      // removeLayer를 호출하면 예외가 나므로 살아 있고 실제로 붙어 있을 때만 제거한다.
      if (layer && isLeafletMapActive(map) && map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
    }
  }, [map])

  // 첫 타일이 실제로 그려진 시점을 부모에 알린다. 이 신호가 오기 전까지 스켈레톤을 유지해야
  // 스타일·타일을 받는 동안 빈 회색 배경이 그대로 노출되지 않는다.
  React.useEffect(() => {
    if (!glMap) return

    const notifyReady = () => onReadyRef.current?.()

    // 스타일이 이미 로드된 뒤에 이 effect가 붙으면 load 이벤트를 놓치므로 즉시 알린다.
    if (glMap.isStyleLoaded()) {
      notifyReady()
      return
    }

    glMap.on("load", notifyReady)
    return () => {
      glMap.off("load", notifyReady)
    }
  }, [glMap])

  React.useEffect(() => {
    if (!glMap) return

    const recolor = () => applyCategoryColors(glMap)

    // load: 최초 스타일 로드 완료. styledata: 스타일이 늦게/재로딩될 때 재적용(idempotent).
    glMap.on("load", recolor)
    glMap.on("styledata", recolor)
    recolor()

    return () => {
      glMap.off("load", recolor)
      glMap.off("styledata", recolor)
    }
  }, [glMap])

  React.useEffect(() => {
    if (!glMap) return

    const relabel = () => applyLabelLanguage(glMap, language)

    // 스타일 로드 전에는 레이어가 없어 setLayoutProperty가 무시된다. styledata로 다시 시도한다.
    glMap.on("styledata", relabel)
    relabel()

    return () => {
      glMap.off("styledata", relabel)
    }
  }, [glMap, language])

  return null
}

export { VectorTileLayer }
