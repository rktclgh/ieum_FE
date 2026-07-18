import type { LayerSpecification, Map as MaplibreMap, StyleSpecification } from "maplibre-gl"

import {
  MAP_FONT_STACK,
  MAP_GLYPHS_URL,
  MAP_HIDDEN_LAYER_IDS,
  MAP_PLACE_LABEL_FALLBACK_SIZE,
  MAP_PLACE_LABEL_LAYER_ID,
  MAP_PLACE_LABEL_SIZES,
  MAP_ROAD_LABEL_LAYER_IDS,
  MAP_ROAD_LABEL_SIZE,
  MAP_STYLE_URL,
  getLabelTextField,
} from "@/features/map/constants/map"
import type { LanguageCode } from "@/lib/i18n/languages"

// 크기를 class별로 갈라주는 data-driven 표현식. MAP_PLACE_LABEL_SIZES를 match 표현식으로 편다.
// (["match", ["get","class"], "borough", 15, "quarter", 13, ..., 11] 형태)
function buildPlaceLabelSize(): unknown {
  const cases = Object.entries(MAP_PLACE_LABEL_SIZES).flatMap(([className, size]) => [
    className,
    size,
  ])

  return ["match", ["get", "class"], ...cases, MAP_PLACE_LABEL_FALLBACK_SIZE]
}

// 이름을 표시하는 라벨인지 판별한다. 노선번호 shield는 ref를 쓰므로 여기 걸리지 않고,
// 지명·도로명·수계명 등 name 계열 라벨만 언어 전환 대상이 된다.
function isNameLabel(layer: LayerSpecification): boolean {
  if (layer.type !== "symbol") return false

  const textField = layer.layout?.["text-field"]
  if (!textField) return false

  return JSON.stringify(textField).includes('"name')
}

// 스타일 JSON을 받아 라벨 위계를 재정의한다. 지도가 뜬 뒤 setLayoutProperty로 고치면 기본 스타일이
// 한 프레임 보였다가 바뀌는 깜빡임이 생기므로, 로드 전에 스타일 객체 자체를 손본다.
function applyLabelStyle(style: StyleSpecification, language: LanguageCode): StyleSpecification {
  // 자체 호스팅 글리프로 교체. 이 URL이 바뀌면 스타일이 참조하는 모든 폰트 스택을 우리가 가진
  // 스택으로 바꿔줘야 한다 — 없는 스택을 요청하면 404가 나고 그 레이어의 라벨이 통째로 사라진다.
  style.glyphs = MAP_GLYPHS_URL

  for (const layer of style.layers) {
    if (MAP_HIDDEN_LAYER_IDS.includes(layer.id)) {
      layer.layout = { ...layer.layout, visibility: "none" }
      continue
    }

    if (layer.type !== "symbol") continue

    // Positron은 Noto Sans의 Regular/Bold/Italic 세 스택을 쓴다. 우리가 굽는 건 Regular 하나뿐이라
    // 전부 그리로 모은다.
    layer.layout = { ...layer.layout, "text-font": [MAP_FONT_STACK] }

    if (isNameLabel(layer)) {
      layer.layout = { ...layer.layout, "text-field": getLabelTextField(language) } as never
    }

    if (MAP_ROAD_LABEL_LAYER_IDS.includes(layer.id)) {
      layer.layout = { ...layer.layout, "text-size": MAP_ROAD_LABEL_SIZE }
      continue
    }

    if (layer.id === MAP_PLACE_LABEL_LAYER_ID) {
      layer.layout = {
        ...layer.layout,
        "text-size": buildPlaceLabelSize(),
        // 기본값은 이탤릭 + 대문자 + 자간 0.1이라 한글에서 특히 읽기 나쁘다.
        "text-transform": "none",
        "text-letter-spacing": 0,
      } as typeof layer.layout

      // 굵기 대신 halo를 키워 배경에서 띄운다.
      layer.paint = {
        ...layer.paint,
        "text-color": "#4A4A4A",
        "text-halo-color": "#FFFFFF",
        "text-halo-width": 1.5,
      } as typeof layer.paint
    }
  }

  return style
}

// 스타일 원본을 받아 라벨 위계를 적용한 객체를 돌려준다. maplibre-gl은 URL 대신 스타일 객체를
// 그대로 받으므로, glyphs까지 바꾸려면 이렇게 미리 받아서 손본 뒤 넘겨야 한다.
async function loadMapStyle(language: LanguageCode): Promise<StyleSpecification> {
  const response = await fetch(MAP_STYLE_URL)
  if (!response.ok) {
    throw new Error(`지도 스타일을 불러오지 못했습니다: ${response.status}`)
  }

  const style = (await response.json()) as StyleSpecification

  return applyLabelStyle(style, language)
}

// 언어 전환 시 이름 라벨만 갱신한다. 스타일을 다시 받아 setStyle하면 타일까지 새로 그려지므로
// text-field만 바꾼다.
//
// 이 함수는 styledata 리스너 안에서 호출된다. getLabelTextField는 매번 새 배열을 반환하므로
// 무조건 setLayoutProperty를 부르면 styledata → set → styledata 무한 루프에 빠진다
// (applyCategoryColors가 색상에 대해 두는 것과 같은 가드). 값이 실제로 달라졌을 때만 쓴다.
function applyLabelLanguage(map: MaplibreMap, language: LanguageCode) {
  const layers = map.getStyle()?.layers
  if (!layers) return

  const textField = getLabelTextField(language)
  const textFieldString = JSON.stringify(textField)

  for (const layer of layers) {
    if (!isNameLabel(layer)) continue

    if (JSON.stringify(map.getLayoutProperty(layer.id, "text-field")) === textFieldString) continue

    map.setLayoutProperty(layer.id, "text-field", textField as never)
  }
}

export { applyLabelLanguage, applyLabelStyle, loadMapStyle }
