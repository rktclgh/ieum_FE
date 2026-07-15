# #110 검색/클릭 장소 핀 + 만들기 프리필

작성일: 2026-07-15 · 브랜치: `feat/#110` (develop 기준, 별도 워크트리)

## 배경

지도 홈([home-map-screen.tsx](../../../src/features/map/components/home-map-screen.tsx))의 현재 동작:

- 지도 클릭 시 좌표(`clickedPosition`)를 검색바의 라벨(역지오코딩 주소)로만 사용하고, MapCanvas의 `selectedPosition`(파란 Figma Location/XL 핀) prop에는 넘기지 않아 **화면에 핀이 실제로 표시되지 않는다.**
- 검색 결과 선택 시(`onSelectPlace`)는 `setClickedPosition(null)`로 오히려 지운 뒤 지도만 재중심한다 → 핀 없음.
- 모임/질문 만들기 화면은 각자 `MeetupLocationPicker` 풀스크린으로 장소를 새로 고르며, 홈의 핀 위치를 넘겨받지 않는다.

파란 핀 아이콘(`selectedLocationIcon`)과 렌더 로직은 [map-canvas.tsx:205-207](../../../src/features/map/components/map-canvas.tsx#L205-L207)에 이미 있고, 장소선택 지도([meetup-location-map.tsx:111](../../../src/features/meetup/components/meetup-location-map.tsx#L111))가 `selectedPosition={clicked}`로 그 핀을 쓴다. 홈도 같은 `selectedPosition`을 쓰면 동일한 핀이 된다(신규 아이콘 불필요).

## 목표 (#110)

1. **검색 결과 선택 → 핀 표시 + 재중심** (A): 검색창을 닫고 선택 장소에 핀을 꽂으며 지도를 그 지점으로 재중심한다.
2. **핀 재클릭 → 제거(토글)** (B): 사용자가 꽂은 핀을 다시 누르면 사라진다.
3. **핀 위치를 모임/질문 만들기 장소에 프리필** (C): 핀이 있는 상태로 만들기로 넘어가면 장소 칸이 채워지고, 프리필만으로 제출 버튼이 활성화된다(수정은 선택).

지도 클릭으로 핀을 꽂는 경로와 검색으로 꽂는 경로는 **하나의 사용자 핀**으로 통합한다(장소선택 지도와 동일한 핀). 새로 고르면 이전 핀을 교체한다.

## 설계

### 1. 상태 모델 (home-map-screen)

`clickedPosition: Coordinates | null`을 라벨 품질을 담을 수 있는 값으로 확장한다.

```ts
interface SelectedLocation {
  lat: number
  lng: number
  label?: string    // 검색: place.name  / 지도클릭: undefined (역지오코딩 shortLabel로 표시)
  address?: string  // 검색: place.address / 지도클릭: undefined (역지오코딩 fullAddress로 표시)
}
```

- 지도 클릭(`onMapClick`) → `setSelectedLocation({ lat, lng })` (label/address 없음).
- 검색 선택(`onSelectPlace`) → `setSelectedLocation({ lat: place.lat, lng: place.lng, label: place.name, address: place.address })` + `recenterTo` + 검색창 닫기.
- 한 번에 사용자 핀 하나만 존재. 새 선택이 이전을 교체.

타입은 홈 로컬(파일 상단) 또는 `map/api/pin-types.ts` 중 최소 변경 쪽에 둔다.

### 2. 핀 표시 (A)

- MapCanvas에 `selectedPosition={selectedLocation}`을 넘겨(현재 미전달) 파란 핀을 렌더한다.
- 검색 선택 흐름을 위 상태 모델대로 변경한다(기존 `setClickedPosition(null)` 제거).

### 3. 핀 토글 제거 (B)

- `map-canvas.tsx`의 선택 Marker에 `onSelectedPositionClick?: () => void` prop을 추가하고 `eventHandlers={{ click }}`로 연결한다. Leaflet은 마커 클릭을 지도 `click`으로 전파하지 않으므로, 핀을 눌러 지워도 `onMapClick`이 다시 꽂지 않는다.
- 홈은 `onSelectedPositionClick={() => setSelectedLocation(null)}`을 전달한다.
- 검색바의 X 버튼(`onClearSelectedLocation`)도 `setSelectedLocation(null)`로 통일한다.

### 4. 만들기 프리필 (C)

홈에서 `selectedLocation` + 역지오코딩 결과로 `selectedPlace: MeetupPlaceValue | null`을 파생한다(라벨이 확보됐을 때만 non-null):

```ts
const label = selectedLocation?.label ?? reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress
const address = selectedLocation?.address ?? reverseGeocoded?.fullAddress ?? reverseGeocoded?.shortLabel
const selectedPlace =
  selectedLocation && label && address
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng, address, label }
    : null
```

- `CreateMeetupScreen` / `CreateQuestionScreen`에 `initialPlace?: MeetupPlaceValue` prop을 추가하고 폼 `place` 초기값으로 쓴다.
  - `use-create-meetup-form.ts`가 optional 초기 place를 받도록 시그니처를 확장한다.
  - 질문 화면은 이미 edit prefill 패턴이 있으므로 create 모드 초기값을 `initialPlace ?? null`로 합류시킨다.
- 프리필돼도 장소 칸을 탭하면 기존 `MeetupLocationPicker`로 변경 가능(수정은 선택). 프리필만으로 제출 버튼 활성화.
- 이동 시점에 지오코딩을 새로 호출하지 않는다(이미 확보한 캐시/Place 재사용).

### 5. 지오코딩 호출량 방어

이 기능은 호출 지점을 늘리지 않는다(지도 클릭 1지점당 역지오코딩 1회는 기존과 동일, 검색·프리필·토글은 0회). 다만 아래를 지킨다.

- **검색 핀은 역지오코딩하지 않는다.** 라벨이 없는 핀(지도 클릭 출신)에만 실행:
  ```ts
  const geoTarget = selectedLocation && !selectedLocation.label ? selectedLocation : null
  const { data: reverseGeocoded } = useReverseGeocode(geoTarget)
  ```
- **방어 1 — 역지오코딩 `staleTime: Infinity`**: 좌표→주소는 불변이므로 [use-reverse-geocode.ts](../../../src/features/map/hooks/use-reverse-geocode.ts)의 `staleTime`을 `Infinity`로 올린다(장소선택 지도와 공유하는 훅이라 양쪽 이득). `gcTime`도 넉넉히.
- **방어 2 — 좌표 반올림**: 역지오코딩 호출/캐시 키에 쓰는 좌표를 약 5자리(≈1m)로 반올림해, 거의 같은 지점 연타의 캐시 적중률을 높인다. 반올림은 `use-reverse-geocode.ts` 내부에서 처리해 호출부는 raw 좌표를 넘겨도 되게 한다.

## 변경 파일

신규 API·i18n 문자열 없음.

1. `src/features/map/components/map-canvas.tsx` — `onSelectedPositionClick` prop + 선택 Marker `eventHandlers`
2. `src/features/map/components/home-map-screen.tsx` — 상태 모델 확장, `selectedPosition` 전달, 토글 제거, 검색 선택 핀, `geoTarget`(검색 핀 제외), `selectedPlace` 파생, 만들기에 `initialPlace` 전달
3. `src/features/map/hooks/use-reverse-geocode.ts` — 좌표 반올림 + `staleTime: Infinity`
4. `src/features/meetup/hooks/use-create-meetup-form.ts` — optional 초기 place 인자
5. `src/features/meetup/components/create-meetup-screen.tsx` — `initialPlace` prop
6. `src/features/question/components/create-question-screen.tsx` — `initialPlace` prop (create 모드 초기값 합류)

## 검증

- `pnpm build` 클린 통과(푸시 전 필수).
- 수동 확인 흐름:
  1. 검색 → 결과 A 탭 → 검색창 닫힘 + A에 파란 핀 + 지도 A로 재중심.
  2. 핀 재탭 → 핀 제거. 검색바 X도 동일하게 제거.
  3. 지도 빈 곳 클릭 → 같은 파란 핀. 재탭 제거.
  4. 핀 있는 상태로 "모임 만들기"/"질문하기" → 장소 칸에 라벨(검색은 상호명, 클릭은 주소) 프리필 + 제출 활성. 장소 탭 시 변경 가능.
  5. 네트워크 탭: 검색 선택·만들기 이동에서 역지오코딩 신규 호출 0. 같은 지점 반복은 캐시 적중.

## 범위 밖

- 모임 생성 후 홈 핀 자동 정리(생성 후에도 핀은 그대로 둔다).
- 좌표 정밀도/카테고리 표시 등 부가 개선.
- 지도 클릭 핀에 대한 별도 상호명 부여 UI(만들기 안 `MeetupLocationPicker` 직접입력으로 이미 가능).
