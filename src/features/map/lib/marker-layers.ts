// MapLibre 소스/레이어 id와 페인트/레이아웃 스펙을 한곳에 모은다. 실제 addSource/addLayer
// 호출은 use-marker-layers.ts가 한다 — 여기는 순수 데이터.

import type { LayerSpecification } from "maplibre-gl"

const MARKERS_SOURCE_ID = "ieum-markers"
const USER_LOCATION_SOURCE_ID = "ieum-user-location"
const SELECTED_LOCATION_SOURCE_ID = "ieum-selected-location"

const MARKER_SHADOW_LAYER_ID = "marker-shadow"
const MARKER_ICON_LAYER_ID = "marker-icon"
const CLUSTER_FILL_LAYER_ID = "cluster-fill"
const CLUSTER_COUNT_LAYER_ID = "cluster-count"
const USER_LOCATION_HALO_LAYER_ID = "user-location-halo"
const USER_LOCATION_RING_LAYER_ID = "user-location-ring"
const USER_LOCATION_CORE_LAYER_ID = "user-location-core"
const SELECTED_LOCATION_LAYER_ID = "selected-location"

const GRAY_900 = "#1f2324" // --color-gray-900 (ClusterPin 배경)
const LIVE_ACCENT = "#FC7045" // map-center-pin.tsx PIN_ACCENT와 동일 값

// 44px 원 마커의 반지름(px). 핀/클러스터/스택 공통.
const MARKER_RADIUS = 22

// box-shadow: 0 2px 4px rgba(0,0,0,.25) 근사치. circle-blur는 CSS 가우시안 블러와 커널이
// 달라 완전히 동일하진 않다 — 실기기 확인 후 조정 대상(설계 문서 참고). 이 레이어가
// 핀/클러스터/스택 클릭의 히트테스트 대상도 겸한다(원 지오메트리라 네이티브 원형 히트테스트).
const MARKER_SHADOW_SPEC: LayerSpecification = {
  id: MARKER_SHADOW_LAYER_ID,
  type: "circle",
  source: MARKERS_SOURCE_ID,
  paint: {
    "circle-radius": MARKER_RADIUS,
    "circle-color": "#000000",
    "circle-opacity": 0.25,
    "circle-blur": 0.6,
    "circle-translate": [0, 2],
  },
}

// pin은 symbol(marker-icon)이 그리고, cluster/stack은 이 원(비주얼 전용, 클릭은 shadow가 담당).
const CLUSTER_FILL_SPEC: LayerSpecification = {
  id: CLUSTER_FILL_LAYER_ID,
  type: "circle",
  source: MARKERS_SOURCE_ID,
  filter: ["in", ["get", "kind"], ["literal", ["cluster", "stack"]]],
  paint: {
    "circle-radius": MARKER_RADIUS,
    "circle-color": GRAY_900,
  },
}

const CLUSTER_COUNT_SPEC: LayerSpecification = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: "symbol",
  source: MARKERS_SOURCE_ID,
  filter: ["in", ["get", "kind"], ["literal", ["cluster", "stack"]]],
  layout: {
    "text-field": ["get", "countLabel"],
    "text-size": 15,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#ffffff",
  },
}

// 비주얼 전용(클릭은 marker-shadow가 담당 — symbol layer 히트테스트는 alpha가 아니라
// 사각 bbox 기준이라 원형 판정을 못 준다).
const MARKER_ICON_SPEC: LayerSpecification = {
  id: MARKER_ICON_LAYER_ID,
  type: "symbol",
  source: MARKERS_SOURCE_ID,
  filter: ["==", ["get", "kind"], "pin"],
  layout: {
    "icon-image": ["get", "iconId"],
    "icon-size": 1,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
}

function userLocationCircleSpec(id: string, radius: number, opacity: number): LayerSpecification {
  return {
    id,
    type: "circle",
    source: USER_LOCATION_SOURCE_ID,
    paint: {
      "circle-radius": radius,
      "circle-color": LIVE_ACCENT,
      "circle-opacity": opacity,
    },
  }
}

// map-canvas.tsx의 USER_LOCATION_HALO_SIZE(44→반지름22)/RING_SIZE(24→12)/CORE_SIZE(14→7)와
// 오파시티(0.15/0.3/코어는 불투명) 그대로.
const USER_LOCATION_HALO_SPEC = userLocationCircleSpec(USER_LOCATION_HALO_LAYER_ID, 22, 0.15)
const USER_LOCATION_RING_SPEC = userLocationCircleSpec(USER_LOCATION_RING_LAYER_ID, 12, 0.3)
const USER_LOCATION_CORE_SPEC = userLocationCircleSpec(USER_LOCATION_CORE_LAYER_ID, 7, 1)

const SELECTED_LOCATION_SPEC: LayerSpecification = {
  id: SELECTED_LOCATION_LAYER_ID,
  type: "symbol",
  source: SELECTED_LOCATION_SOURCE_ID,
  layout: {
    "icon-image": "selected-location-pin",
    "icon-size": 1,
    "icon-anchor": "bottom",
    "icon-offset": [0, 6],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
}

// 그려지는 순서 그대로: 아래(핀) → 위(선택 위치). 원본 zIndexOffset 순서(#302, #412)와 동치.
const MARKER_LAYER_SPECS: readonly LayerSpecification[] = [
  MARKER_SHADOW_SPEC,
  MARKER_ICON_SPEC,
  CLUSTER_FILL_SPEC,
  CLUSTER_COUNT_SPEC,
  USER_LOCATION_HALO_SPEC,
  USER_LOCATION_RING_SPEC,
  USER_LOCATION_CORE_SPEC,
  SELECTED_LOCATION_SPEC,
]

export {
  MARKERS_SOURCE_ID,
  USER_LOCATION_SOURCE_ID,
  SELECTED_LOCATION_SOURCE_ID,
  MARKER_SHADOW_LAYER_ID,
  MARKER_ICON_LAYER_ID,
  CLUSTER_FILL_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  USER_LOCATION_HALO_LAYER_ID,
  USER_LOCATION_RING_LAYER_ID,
  USER_LOCATION_CORE_LAYER_ID,
  SELECTED_LOCATION_LAYER_ID,
  MARKER_RADIUS,
  MARKER_LAYER_SPECS,
}
