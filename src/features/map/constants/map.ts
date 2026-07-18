import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import type { LanguageCode } from "@/lib/i18n/languages"

// 위치 권한 거부/실패 시 기본 중심 좌표 (서울 시청)
const DEFAULT_MAP_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 }

const DEFAULT_MAP_ZOOM = 16

// 진입 시 내 위치를 이 시간까지 기다렸다가 지도를 마운트한다(명동→내위치 이동 모션 제거).
// 초과하면 기본 좌표로 먼저 띄우고, 이후 위치가 잡히면 조용히 재중심한다.
const MAP_LOCATION_WAIT_MS = 3500

// 홈 지도에서 오버레이가 지도를 가리는 높이(px). flyToBounds 패딩에 써서 재중심·클러스터 확대 시
// 핀이 "보이는" 영역(헤더/탭바 제외) 정중앙에 오도록 한다. 대략치이며 실기기 확인 후 조정 가능.
const MAP_TOP_INSET = 120 // 검색바 + 카테고리 칩 (상단 p-4 포함)
const MAP_BOTTOM_INSET = 96 // 탭바 + FAB 영역

// OpenFreeMap Positron — 흰색/회색 톤의 미니멀 벡터 베이스맵 (API 키 불필요).
// 벡터 타일이라 water/landcover/building/transportation을 레이어별로 색칠할 수 있다.
// provider 교체 시 이 URL만 바꾸면 된다(예: MapTiler 스타일 URL).
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"

// 지형 카테고리별로 덮어쓸 색상. 스타일 레이어의 source-layer 기준이라(레이어 id가 아니라)
// 여러 개로 쪼개진 도로 레이어 등도 한 번에 매칭된다. OpenMapTiles 스키마 기준.
// type: 'fill'이면 fill-color, 'line'이면 line-color 페인트 프로퍼티를 덮어쓴다.
const MAP_CATEGORY_COLORS: ReadonlyArray<{
  sourceLayers: readonly string[]
  type: "fill" | "line"
  color: string
}> = [
  { sourceLayers: ["water"], type: "fill", color: "#C2E0F6" }, // 물가
  { sourceLayers: ["landcover", "park"], type: "fill", color: "#C0E3A5" }, // 공원·풀·산
  { sourceLayers: ["building"], type: "fill", color: "#EFECF0" }, // 건물
  { sourceLayers: ["transportation"], type: "line", color: "#FFFFFF" }, // 도로
]

// 도로 위 노선번호 방패(국도 3호선 → "3", 중복구간 → "3;71"). OSM ref 태그가 그대로 노출되는
// 건데 모임 지도에서는 정보가치가 없고 시각적 노이즈만 된다. Positron 스타일의 shield 레이어 전체.
const MAP_HIDDEN_LAYER_IDS: readonly string[] = [
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
]

// 도로명(백제고분로 등)은 기본 12~13px로 지명(9~10px)보다 크다. 모임 지도에서는 "지금 어느 동네인가"가
// 더 중요하므로 위계를 뒤집는다. 여기서 도로명을 줄이고, 아래 MAP_PLACE_LABEL_SIZES에서 지명을 키운다.
const MAP_ROAD_LABEL_LAYER_IDS: readonly string[] = [
  "highway-name-major",
  "highway-name-minor",
  "highway-name-path",
]

const MAP_ROAD_LABEL_SIZE = 10

// 행정구역 라벨 크기(px). place 소스 레이어의 class 값 기준이며, 실제 타일을 디코딩해 확인한 매핑은
// 서울특별시=city / 광진구=borough / 광장동=quarter 다. city는 스타일 기본(z11+ 18px)이 이미 충분해
// 건드리지 않고, label_other가 그리는 borough·quarter만 키운다. 목록에 없는 class는 fallback 크기.
//
// 자체 호스팅하는 글리프 스택이 Regular 하나뿐이라(아래 MAP_FONT_STACK 주석 참고) 구·동 강조는
// 굵기가 아니라 크기와 halo로 준다.
const MAP_PLACE_LABEL_SIZES: Readonly<Record<string, number>> = {
  borough: 15, // 구
  quarter: 13, // 동
  suburb: 13,
  neighbourhood: 12,
}

const MAP_PLACE_LABEL_FALLBACK_SIZE = 11

// label_other는 borough·quarter를 이탤릭 + 대문자 + 9~10px로 그려서 사실상 안 보인다. 여기서 덮어쓴다.
const MAP_PLACE_LABEL_LAYER_ID = "label_other"

// 지도 라벨은 DOM 텍스트가 아니라 style.glyphs에서 받아오는 SDF 아틀라스라 CSS나 next/font로는
// 바뀌지 않는다. OpenFreeMap은 Noto Sans만 서빙하므로(Pretendard Regular → 404) Pretendard를 직접
// 구워 self-host한다. scripts/build-map-glyphs.mjs 참고 — 스택명이 산출물 디렉터리명과 일치해야 한다.
//
// 스택은 Regular 하나뿐이다. Pretendard가 한글·키릴·베트남어·가나는 전부 커버하지만 한자와 태국어는
// 없어서, Noto fallback을 합성하는 대신 ja/zh/th 지명을 로마자로 대체하는 쪽을 택했다
// (getPlaceLabelTextField 참고). 덕분에 산출물이 8.4MB에서 멈춘다.
const MAP_FONT_STACK = "Pretendard Regular"

const MAP_GLYPHS_URL = "/fonts/{fontstack}/{range}.pbf"

// Pretendard 글리프로 표기 가능한 언어. 나머지(ja·zh·th)는 name:{lang}이 타일에 있어도 한자·태국
// 문자라 두부로 깨지므로 아예 요청하지 않고 로마자로 떨어뜨린다.
const MAP_NATIVE_LABEL_LANGUAGES: readonly LanguageCode[] = ["ko", "en", "vi", "ru"]

// 이름 라벨의 text-field. 타일에 name:{lang}이 들어있지만 커버리지가 균일하지 않아
// (예: 광장동은 name:vi/ru가 없다) 로마자(name:latin) → 원문(name) 순으로 떨어뜨린다.
// ko는 name:ko가 곧 원문이라 로마자 단계를 거치지 않는다.
//
// 지명뿐 아니라 도로명·수계명에도 같이 쓴다. Positron 기본값은 "Gwangnaru-ro 광나루로"처럼
// 로마자와 원문을 붙여 쓰는데, 길이가 두 배가 되면서 화면이 도로명으로 뒤덮인다.
function getLabelTextField(language: LanguageCode): unknown {
  if (language === "ko") {
    return ["coalesce", ["get", "name:ko"], ["get", "name"]]
  }

  if (!MAP_NATIVE_LABEL_LANGUAGES.includes(language)) {
    return ["coalesce", ["get", "name:latin"], ["get", "name"]]
  }

  return ["coalesce", ["get", `name:${language}`], ["get", "name:latin"], ["get", "name"]]
}

export {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TOP_INSET,
  MAP_BOTTOM_INSET,
  MAP_LOCATION_WAIT_MS,
  MAP_STYLE_URL,
  MAP_CATEGORY_COLORS,
  MAP_HIDDEN_LAYER_IDS,
  MAP_ROAD_LABEL_LAYER_IDS,
  MAP_ROAD_LABEL_SIZE,
  MAP_PLACE_LABEL_SIZES,
  MAP_PLACE_LABEL_FALLBACK_SIZE,
  MAP_PLACE_LABEL_LAYER_ID,
  MAP_FONT_STACK,
  MAP_GLYPHS_URL,
  getLabelTextField,
}
