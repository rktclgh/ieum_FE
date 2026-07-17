"use client"

import L from "leaflet"
import type { Map as MaplibreMap } from "maplibre-gl"
import * as React from "react"
import { useMap } from "react-leaflet"
import "maplibre-gl/dist/maplibre-gl.css"
import "@maplibre/maplibre-gl-leaflet"

import { MAP_CATEGORY_COLORS, MAP_STYLE_URL } from "@/features/map/constants/map"

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

  React.useEffect(() => {
    // MapContainer가 해제되는 중이면 Leaflet의 pane도 함께 사라진다. 이 시점에 레이어를 붙이면
    // maplibre-gl-leaflet 내부에서 제거된 mapPane을 읽어 예외가 나므로, 현재 map이 살아 있을 때만 시작한다.
    if (!map.getPane("tilePane")) return

    const layer = L.maplibreGL({ style: MAP_STYLE_URL })
    layer.addTo(map)

    // 초기화 지연 등으로 내부 MapLibre 인스턴스가 아직 없을 수 있어 존재를 확인하고 바인딩한다.
    const glMap = layer.getMaplibreMap()
    const recolor = glMap ? () => applyCategoryColors(glMap) : null
    if (glMap && recolor) {
      // load: 최초 스타일 로드 완료. styledata: 스타일이 늦게/재로딩될 때 재적용(idempotent).
      glMap.on("load", recolor)
      glMap.on("styledata", recolor)
    }

    return () => {
      if (glMap && recolor) {
        glMap.off("load", recolor)
        glMap.off("styledata", recolor)
      }
      // 부모 MapContainer가 먼저 제거한 경우에는 이미 layer가 빠져 있다.
      if (map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
    }
  }, [map])

  return null
}

export { VectorTileLayer }
