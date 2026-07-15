# 지도 베이스맵 카테고리별 색상 커스터마이징 (#88)

## 목표

지도 베이스맵의 지형 카테고리를 각각 지정 색으로 렌더링한다.

| 대상 | 색상 |
|---|---|
| 공원·풀·산 | `#C0E3A5` |
| 물가 | `#C2E0F6` |
| 건물 | `#EFECF0` |
| 도로 | `#FFFFFF` |

## 배경 — 왜 구조를 바꿔야 하나

현재 지도는 **래스터 타일**(CARTO Positron PNG)을 쓴다. 래스터는 이미 그려진 평면 이미지라
물/토지/건물/도로를 분리해 각각 다른 색을 입힐 수 없다. 전체 CSS 필터는 모든 색을 동일하게
이동시켜 카테고리별 지정이 불가능하다.

**벡터 타일**은 water/landcover/building/transportation이 각각 별도 레이어라, 스타일 스펙에서
레이어별 색을 정확히 지정할 수 있다.

## 결정 사항

- **타일 제공자: OpenFreeMap** — API 키 불필요, 완전 무료, 사용량 제한 없음. 정적 배포
  (Spring이 Next `out/` 서빙) 환경에서 키 관리가 필요 없어 가장 깔끔하다. 단, 커뮤니티 운영이라
  SLA 보장은 없다.
- **렌더링 방식: `@maplibre/maplibre-gl-leaflet` 절충** — 기존 Leaflet 지도 위에 벡터 타일
  레이어만 얹는다. `react-leaflet` 기반 마커·실시간 위치·재중심·bounds 감시 로직
  (`map-canvas.tsx`)을 전혀 건드리지 않아 변경 범위가 최소다.

## 설계

### 1. 의존성

- `maplibre-gl`
- `@maplibre/maplibre-gl-leaflet`

(설치는 pnpm. 저장소에 `pnpm-lock.yaml`이 있으므로 npm 금지.)

### 2. `src/features/map/constants/map.ts`

래스터 상수(`MAP_TILE_URL`, `MAP_TILE_SUBDOMAINS`, `MAP_TILE_MAX_ZOOM`, `MAP_TILE_ATTRIBUTION`)를
제거하고 벡터 스타일 상수로 교체한다.

```ts
// OpenFreeMap Positron — 흰/회색 톤 미니멀 벡터 베이스맵 (API 키 불필요)
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"

// 카테고리별 덮어쓸 색상. source-layer 기준(레이어 id 변경에 견고).
// type: 'fill' | 'line' → 각각 fill-color / line-color 페인트 프로퍼티를 덮어쓴다.
const MAP_CATEGORY_COLORS = [
  { sourceLayers: ["water"], type: "fill", color: "#C2E0F6" },        // 물가
  { sourceLayers: ["landcover", "park"], type: "fill", color: "#C0E3A5" }, // 공원·풀·산
  { sourceLayers: ["building"], type: "fill", color: "#EFECF0" },     // 건물
  { sourceLayers: ["transportation"], type: "line", color: "#FFFFFF" }, // 도로
] as const
```

`DEFAULT_MAP_CENTER`, `DEFAULT_MAP_ZOOM`은 유지한다.

### 3. 새 컴포넌트 `src/features/map/components/vector-tile-layer.tsx`

react-leaflet 자식 컴포넌트. 렌더 출력은 없고(`return null`), `useMap()`으로 Leaflet 지도를
얻어 벡터 레이어를 붙인다.

책임:
1. `useEffect`에서 `L.maplibreGL({ style: MAP_STYLE_URL })` 레이어 생성 후 `map`에 추가.
2. 내부 MapLibre 지도(`layer.getMaplibreMap()`)의 `load` 및 `styledata` 이벤트에서
   `getStyle().layers`를 순회. 각 레이어의 `source-layer`가 `MAP_CATEGORY_COLORS`에 매칭되면
   `setPaintProperty(id, 'fill-color' | 'line-color', color)`로 색을 덮어쓴다.
   - id가 아닌 source-layer 기준이라 여러 도로 레이어도 한 번에 처리된다.
   - `styledata`도 듣는 이유: 스타일이 늦게/재로딩될 때도 색을 재적용하기 위함.
3. cleanup: 언마운트 시 `map.removeLayer(layer)`.

이 컴포넌트만이 MapLibre를 알고, `map-canvas.tsx`는 벡터/래스터 여부를 모른다(경계 분리).

### 4. `src/features/map/components/map-canvas.tsx`

- `import "maplibre-gl/dist/maplibre-gl.css"` 추가.
- `<TileLayer url={MAP_TILE_URL} .../>` → `<VectorTileLayer />` 로 한 줄 교체.
- 나머지(마커, `selectedLocationIcon`, `userLocationIcon`, `MapCenterUpdater`,
  `MapClickListener`, `MapBoundsWatcher`, `Circle`, pins)는 전부 그대로.

### 5. i18n

새 UI 문자열 없음 → 메시지 카탈로그 변경 없음.

## 검증

- `pnpm build` 클린 통과 (push 전 필수).
- 로컬에서 지도 렌더 시 물=하늘색, 공원=연두, 건물=연회색, 도로=흰색으로 표시되는지 육안 확인.
- 마커·실시간 위치·재중심·핀 클릭이 기존과 동일하게 동작하는지 확인.

## 리스크 / 완화

- **OpenFreeMap SLA 없음**: 상용 트래픽 급증 대비, provider는 `MAP_STYLE_URL` 상수 한 곳에
  격리 → 필요 시 MapTiler 등으로 URL만 교체.
- **OpenMapTiles 스키마 변경 가능성**: source-layer 이름(`water`/`building`/`transportation`/
  `landcover`)은 OpenMapTiles 표준이라 안정적. 매칭 실패 시 색만 기본값으로 떨어지고 지도는
  정상 렌더(안전 실패).

## 참고 파일

- `src/features/map/constants/map.ts`
- `src/features/map/components/map-canvas.tsx`
