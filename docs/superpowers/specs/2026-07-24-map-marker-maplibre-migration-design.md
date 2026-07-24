# 홈 지도 마커를 MapLibre 네이티브 레이어로 이전 (#493)

## 목표

빠르게 패닝할 때 핀/클러스터/내 위치/선택 위치 마커가 베이스맵 이동 속도를 못 따라가는 문제를 해결한다.
비주얼 디자인(색상·크기·모양·겹침 순서)은 그대로 유지하고, 렌더링 엔진만 교체한다.

## 배경 — 왜 구조를 바꿔야 하나

현재 지도는 Leaflet(`react-leaflet`) 컨테이너 위에 MapLibre GL 벡터 타일 레이어(`VectorTileLayer`,
`L.maplibreGL`)를 얹은 이중 렌더링 구조다. 베이스맵(도로·라벨)은 MapLibre가 WebGL로 그리고,
핀/클러스터/내 위치/선택 위치는 Leaflet DOM 마커(`L.divIcon`)로 별도 그린다.

두 파이프라인은 서로 다른 타이밍으로 화면을 갱신한다 — Leaflet은 CSS transform으로 pane을
옮기고, MapLibre는 매 프레임 WebGL 캔버스를 다시 그린다. 빠르게 드래그하면 이 둘의 동기화가
어긋나면서 마커가 베이스맵보다 뒤처지는 것처럼 보인다. 마커를 MapLibre 레이어(GeoJSON source +
circle/symbol layer)로 옮기면 베이스맵과 마커가 같은 WebGL 캔버스, 같은 프레임에서 그려져
구조적으로 어긋날 수 없다.

## 결정 사항

- **마이그레이션 범위: 지도 위 모든 마커** — 핀(질문/모임), 클러스터, 좌표 겹침 스택, 내 위치,
  선택 위치 전부. 일부만 옮기면 이중 파이프라인 문제가 남는 마커 종류가 그대로 남는다.
- **클러스터링 로직: 기존 `supercluster` 유지** — `use-pin-clusters.ts`/`cluster-index.ts`의
  계산 결과(클러스터/스택/개별 핀 판정, `radius:56`, `maxZoom:17`)를 그대로 GeoJSON feature로
  변환해 소스에 흘려보낸다. MapLibre 네이티브 클러스터링(`cluster:true`)으로 바꾸지 않는다 —
  기존 로직(좌표 겹침 스택 판정 등)을 다시 만들 이유가 없다.
- **그림자는 래스터에 굽지 않고 공유 vector layer로 분리** — 모든 원형 마커 아래 깔리는
  `circle-blur`+`circle-translate` 레이어 하나로 지금의 `box-shadow: 0 2px 4px rgba(0,0,0,.25)`를
  재현한다. 마커 종류가 늘어도 레이어 하나로 커버되고, 매 아이콘 이미지에 그림자를 굽지 않아도
  된다.
- **아이콘: 정적 vs 동적 분리**
  - 정적(질문 핀, no-image 대체 아이콘, 선택 위치 티어드롭)은 앱에서 지도가 뜰 때 1회
    `addImage`.
  - 동적(모임 핀 썸네일)은 pin마다 다른 원격 이미지라 URL별로 캔버스에서 원형 크롭 합성 후
    `addImage`, `Map<url, imageId>`로 캐싱해 같은 썸네일 재요청/재합성을 피한다.
- **내 위치 마커는 완전히 벡터** — 헤일로/링/코어 3중 원을 `circle` layer 3개(반지름·투명도만
  다름)로 그린다. 블러/래스터가 전혀 없어 지금 CSS와 결과가 동일하다.
- **CSS box-shadow와 MapLibre circle-blur는 블러 커널이 다르다** — 44px 원에 4px 블러 수준에서는
  육안으로 구분 안 되게 맞출 수 있지만 픽셀 단위 동일은 보장하지 않는다. 실기기 확인 후 blur
  값을 미세 조정하는 단계가 필요하다.

## 설계

### 1. 신규 파일

#### `src/features/map/lib/marker-image-cache.ts`

- 모임 핀 썸네일 URL → 합성된 이미지 ID를 캐싱하는 모듈.
- 책임:
  1. URL이 캐시에 없으면 `fetch` → `createImageBitmap`.
  2. offscreen `<canvas>`에 흰 배경 원(44px) → 40px 원형 클리핑 영역 → 썸네일을
     `object-fit: cover`와 동일한 비율로 그려 합성.
  3. `map.addImage(imageId, canvas)`로 등록, `Map<url, imageId>`에 기록.
  4. 로드 실패 시 `NO_IMAGE_SRC`(`/icons/map/pin-no-image.svg`) 합성 이미지로 폴백(정적 이미지라
     최초 1회만 합성).
  5. 로딩 중에는 `pin-loading-placeholder`(회색 원, 정적) 이미지 ID를 반환해 즉시 표시하고,
     합성이 끝나면 소스 feature의 `iconId` 프로퍼티만 갱신해 교체.

#### `src/features/map/lib/marker-layers.ts`

- 레이어/소스 정의를 한곳에 모은다: source id, layer id, paint/layout property 상수.
- `marker-shadow`(circle), `marker-icon`(symbol, icon-image), `cluster-shadow`(공유),
  `cluster-circle`(circle) + `cluster-count`(symbol text), `user-location-halo/ring/core`(circle x3),
  `selected-location`(symbol, icon-image) 정의.
- 정적 아이콘(`buildStaticIcons()`) — 질문 핀, no-image, 선택 위치 티어드롭을 canvas에 그려
  `addImage`. 기존 `pin-marker.tsx`의 `QUESTION_SVG`, `map-center-pin.tsx`의 `PIN_COMBINED_SVG`
  마크업을 그대로 재사용해 비주얼을 보존한다.

#### `src/features/map/hooks/use-marker-layers.ts`

- `usePinClusters`(기존) 결과 + `livePosition`/`selectedPosition`을 받아 GeoJSON
  `FeatureCollection`으로 변환하고, MapLibre map 인스턴스의 소스 데이터를 `setData`로 갱신하는
  훅. pins/클러스터가 바뀔 때만 재계산(기존 `usePinClusters`의 메모이제이션 그대로 재사용).

### 2. 이벤트/인터랙션

Leaflet `Marker eventHandlers`(click) 대신 레이어별 클릭 리스너로 교체한다.

**정정(설계 승인 후 발견)**: MapLibre `symbol` 레이어의 히트테스트는 아이콘 alpha 채널이 아니라
렌더된 사각 bbox 기준이라, 아이콘을 원형으로 합성해도 클릭 판정은 사각형으로 남는다. 대신
`marker-shadow`(circle layer)는 원 지오메트리라 네이티브로 원형 히트테스트가 된다 — 클릭 판정은
이 공유 shadow 레이어에서 하고, `marker-icon`/`cluster-icon` symbol 레이어는 순수 비주얼로만
쓴다(`interactive` 옵션 없음 = 애초에 히트테스트 대상이 아님).

```ts
map.on("click", "marker-shadow", (e) => {
  const feature = e.features?.[0]
  if (!feature) return
  const { kind, pinId, clusterId } = feature.properties
  // kind === "pin" → onPinClick(pinsById[pinId])
  // kind === "cluster" → handleClusterClick(clusterId)
  // kind === "stack" → onPinStackClick(...)
})
map.on("click", "selected-location", () => onSelectedPositionClick?.())
```

- `queryRenderedFeatures`로 클릭 지점의 최상위 feature만 판정 — 지금 Leaflet의 `zIndexOffset`
  누적 순서(클러스터 > 개별 핀, 선택 위치 > 내 위치 > 핀)는 레이어 순서(layer order, 나중에
  추가된 레이어가 위)로 그대로 재현한다.
- 클러스터 확장(`flyToBounds`, `EXPAND_EDGE_PADDING`)과 핀 스택 캐러셀 로직은 좌표 계산이라
  변경 없이 재사용(`handleClusterClick`을 `clustered-pins.tsx`에서 새 훅으로 옮기되 로직은 그대로).
- 내 위치 마커는 지금처럼 클릭을 통과시킨다 —애초에 `marker-shadow` 소스 feature에 포함하지
  않는다(별도 원 레이어 3개는 시각 전용, 클릭 리스너 없음).
- 커서: `mouseenter`/`mouseleave`로 `map.getCanvas().style.cursor = "pointer"` 토글(기존 Leaflet
  기본 동작 대체).

### 3. 대체/수정되는 기존 파일

- **대체**: `pin-marker.tsx`, `cluster-marker.tsx` → 정적 아이콘 빌더는 `marker-layers.ts`로,
  런타임 GeoJSON 변환은 `use-marker-layers.ts`로 흡수. `escapeAttr`는 더 이상 HTML 문자열을
  안 만들므로 불필요해지면 제거.
- **대체**: `clustered-pins.tsx` → `useMarkerLayers` 훅 호출 + 클릭 핸들러 등록으로 축소.
- **수정**: `map-canvas.tsx` → `ActiveMarker`/`Marker` import 및 `selectedLocationIcon`,
  `userLocationIcon`, `USER_LOCATION_*` 상수 제거. 대신 `VectorTileLayer`가 노출하는 MapLibre
  map 인스턴스에 마커 레이어를 붙이는 훅을 호출.
- **수정**: `vector-tile-layer.tsx` → 내부 MapLibre map 인스턴스를 부모(또는 컨텍스트)에 노출하는
  콜백(`onMapReady?: (map: maplibregl.Map) => void`) 추가. 지금도 `layer.getMaplibreMap()`으로
  내부 인스턴스에 접근하고 있어(카테고리 색상 적용부, `2026-07-15-map-vector-tile-coloring-design.md`)
  같은 인스턴스를 재사용한다.
- **유지, 변경 없음**: `use-pin-clusters.ts`, `cluster-index.ts`, `map-style.ts`,
  `visible-center.ts`, `locate-following.ts`, `leaflet-map-lifecycle.ts` (Leaflet 컨테이너 자체와
  재중심/제스처 감시는 이번 범위 밖 — `MapContainer`는 계속 Leaflet이 관리).

### 4. 에러 처리

- 썸네일 `fetch` 실패/디코딩 실패 → placeholder 이미지로 영구 폴백(재시도 없음, 기존 `<img>`
  `onError` 폴백과 동등한 수준).
- `addImage`에 이미 존재하는 id를 다시 등록하면 MapLibre가 예외를 던지므로, 캐시에 있으면
  등록을 건너뛰는 가드 필수.
- `styledata`로 스타일이 리로드되면(`vector-tile-layer.tsx`) 등록된 이미지가 초기화될 수 있어,
  `load`/`styledata` 시 정적 아이콘 재등록 + 캐시된 동적 아이콘 재등록 로직 필요.

### 5. 테스트

- 기존 `cluster-index.test.ts`, `distance.test.ts` 등은 로직 변경이 없어 그대로 통과해야 한다.
- 신규 유닛 테스트 대상: `marker-image-cache.ts`의 캐시 히트/미스 분기, GeoJSON 변환 함수
  (`use-marker-layers.ts`가 pins/클러스터를 올바른 feature로 매핑하는지).
- 실기기 검증: 빠른 패닝 시 마커 지연 여부(핵심 성공 기준), 핀 클릭/클러스터 확장/스택 캐러셀/
  선택 위치 토글이 기존과 동일하게 동작하는지.

## 리스크 / 완화

- **CSS 그림자와 vector blur 불일치**: 위 "결정 사항" 참조 — 육안 확인 후 blur 파라미터 조정.
- **스타일 리로드 시 이미지 유실**: `load`/`styledata`에서 재등록 가드로 완화(위 에러 처리 참조).
- **클릭 히트박스 차이**: Leaflet `divIcon`은 사각형 히트박스에 `className: "map-circle-marker"`로
  원 밖 클릭을 걸러냈다(#302). MapLibre `symbol` layer는 alpha 채널이 아니라 사각 bbox로
  히트테스트하므로 아이콘을 원형으로 합성해도 그대로는 해결되지 않는다 — 위 "이벤트/인터랙션"
  절에서 정리했듯, 클릭 판정 자체를 원 지오메트리인 `marker-shadow` circle layer로 옮겨
  네이티브 원형 히트테스트를 그대로 재현한다(symbol layer는 비주얼 전용).

## 참고 파일

- `src/features/map/components/map-canvas.tsx`
- `src/features/map/components/vector-tile-layer.tsx`
- `src/features/map/components/clustered-pins.tsx`
- `src/features/map/components/pin-marker.tsx`
- `src/features/map/components/cluster-marker.tsx`
- `src/features/map/hooks/use-pin-clusters.ts`
- `src/features/map/lib/cluster-index.ts`
- `docs/superpowers/specs/2026-07-15-map-vector-tile-coloring-design.md` (기존 벡터 타일 도입 설계)
