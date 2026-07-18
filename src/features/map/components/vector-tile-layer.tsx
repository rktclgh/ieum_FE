"use client"

import L from "leaflet"
import type { Map as MaplibreMap } from "maplibre-gl"
import * as React from "react"
import { useMap } from "react-leaflet"
import "maplibre-gl/dist/maplibre-gl.css"
import "@maplibre/maplibre-gl-leaflet"

import { MAP_CATEGORY_COLORS } from "@/features/map/constants/map"
import { applyLabelLanguage, loadMapStyle } from "@/features/map/lib/map-style"
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

// 기존 Leaflet 지도 위에 OpenFreeMap 벡터 타일 레이어를 얹고, 지형 카테고리별로 색을 덮어쓴다.
// 렌더 출력은 없다. 마커·실시간 위치·재중심 등 다른 Leaflet 로직과 독립적으로 동작한다.
function VectorTileLayer() {
  const map = useMap()
  const language = useLanguageStore((state) => state.language)

  const [glMap, setGlMap] = React.useState<MaplibreMap | null>(null)

  React.useEffect(() => {
    let layer: L.Layer | null = null
    let cancelled = false

    // 스타일은 언어가 바뀔 때마다 다시 받지 않는다(타일까지 새로 그려진다). 최초 1회만 쓰므로
    // 구독 대신 getState로 읽는다 — 이후 언어 변경은 아래 effect가 text-field만 갱신한다.
    // glyphs URL을 자체 호스팅으로 갈아끼우려면 스타일 객체를 미리 받아 손봐야 해서 비동기다.
    // 그 사이 언마운트되면 이미 사라진 지도에 레이어를 붙이게 되므로 cancelled로 막는다.
    void loadMapStyle(useLanguageStore.getState().language)
      .then((style) => {
        if (cancelled) return

        const glLayer = L.maplibreGL({ style })
        layer = glLayer
        glLayer.addTo(map)

        // 초기화 지연 등으로 내부 MapLibre 인스턴스가 아직 없을 수 있어 존재를 확인하고 바인딩한다.
        const instance = glLayer.getMaplibreMap()
        if (instance) setGlMap(instance)
      })
      .catch((error: unknown) => {
        // 스타일을 못 받으면 지도는 마커만 뜬 빈 배경이 된다. 조용히 죽지 않도록 남긴다.
        console.error("지도 스타일 로드 실패", error)
      })

    return () => {
      cancelled = true
      setGlMap(null)
      if (layer) map.removeLayer(layer)
    }
  }, [map])

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
