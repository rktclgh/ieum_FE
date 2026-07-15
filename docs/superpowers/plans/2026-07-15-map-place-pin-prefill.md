# #110 검색/클릭 장소 핀 + 만들기 프리필 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지도 홈에서 검색 결과·지도 클릭을 하나의 파란 핀으로 통합 표시(재클릭 시 제거)하고, 그 핀 위치를 모임/질문 만들기 장소에 프리필한다.

**Architecture:** 홈(`home-map-screen`)이 단일 `selectedLocation` 상태로 사용자 핀을 관리한다. 지도 클릭은 좌표만, 검색 선택은 좌표+상호명+주소를 담는다. 핀은 장소선택 지도와 동일한 `MapCanvas`의 `selectedPosition`으로 렌더하고, 마커 클릭으로 토글 제거한다. 만들기 화면은 `initialPlace` prop으로 프리필된 `MeetupPlaceValue`를 받아 폼 초기값으로 쓴다.

**Tech Stack:** Next.js 16, React, TypeScript, react-leaflet, @tanstack/react-query.

## Global Constraints

- 패키지 매니저는 **pnpm** 전용. `npm install` 금지.
- 폴더/파일명은 lowercase kebab-case.
- 하드코딩 한국어 UI 문자열 신규 추가 금지(이 기능은 신규 문자열 없음 — 기존 재사용).
- 커밋 메시지에 `Co-Authored-By` 트레일러 금지.
- 커밋 메시지 형식은 기존 컨벤션(`feat: #110 ...`, `refactor: #110 ...`) 따름.
- 푸시 전 `pnpm build` 클린 통과 필수.
- 이 저장소엔 단위 테스트 러너가 없다. 각 태스크 검증은 `pnpm typecheck`(+ 필요 시 `pnpm lint`)로 하고, 최종 태스크에서 `pnpm build` + 수동 브라우저 확인.
- 작업 위치: 워크트리 `.claude/worktrees/feat-110`, 브랜치 `feat/#110`(base develop).

---

### Task 1: 역지오코딩 호출량 방어 (좌표 반올림 + staleTime 영구)

**Files:**
- Modify: `src/features/map/hooks/use-reverse-geocode.ts`

**Interfaces:**
- Consumes: `reverseGeocode(lat, lng)` (기존), `Coordinates` (기존).
- Produces: `useReverseGeocode(position: Coordinates | null)` — 시그니처 불변. 내부적으로 좌표를 5자리(≈1m)로 반올림해 캐시 키/호출에 쓰고, `staleTime: Infinity`로 세션 내 재조회를 없앤다. (`meetup-location-map`도 공유하는 훅 — 호출부 변경 불필요.)

- [ ] **Step 1: 훅을 좌표 반올림 + staleTime Infinity로 교체**

`src/features/map/hooks/use-reverse-geocode.ts` 전체를 아래로 교체:

```ts
"use client"

import { useQuery } from "@tanstack/react-query"

import { reverseGeocode } from "@/features/map/api/reverse-geocode-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

// 좌표를 소수점 5자리(약 1m)로 반올림한다. 거의 같은 지점을 연타로 클릭해도
// 같은 캐시 키에 맞도록 하여 역지오코딩 재호출을 줄인다.
function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

function useReverseGeocode(position: Coordinates | null) {
  const lat = position ? roundCoord(position.lat) : null
  const lng = position ? roundCoord(position.lng) : null

  return useQuery({
    queryKey: ["places", "reverse-geocode", lat, lng],
    queryFn: () => reverseGeocode(lat!, lng!),
    enabled: lat !== null && lng !== null,
    meta: PUBLIC_QUERY_META,
    // 좌표→주소는 불변이므로 세션 내 재조회하지 않는다.
    staleTime: Infinity,
  })
}

export { useReverseGeocode }
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 통과 (에러 0).

- [ ] **Step 3: 커밋**

```bash
git add src/features/map/hooks/use-reverse-geocode.ts
git commit -m "refactor: #110 역지오코딩 좌표 반올림·staleTime 영구화로 호출량 방어"
```

---

### Task 2: MapCanvas 선택 핀 클릭(토글 제거) 지원

**Files:**
- Modify: `src/features/map/components/map-canvas.tsx`

**Interfaces:**
- Consumes: 기존 `selectedPosition?: Coordinates | null`, `selectedLocationIcon`(기존), react-leaflet `Marker`.
- Produces: `MapCanvasProps`에 `onSelectedPositionClick?: () => void` 추가. 지정 시 선택 핀 마커 클릭에 연결. Leaflet은 마커 클릭을 지도 `click`으로 전파하지 않으므로 `onMapClick`이 다시 트리거되지 않는다.

- [ ] **Step 1: prop 타입 추가**

`src/features/map/components/map-canvas.tsx`의 `interface MapCanvasProps` 안, `selectedPosition` 선언 바로 아래에 추가:

```ts
  /** 선택 핀 마커를 클릭했을 때 (핀 토글 제거용). 미지정이면 마커 클릭 무반응 */
  onSelectedPositionClick?: () => void
```

- [ ] **Step 2: 함수 파라미터 구조분해에 추가**

`function MapCanvas({ ... })`의 구조분해 목록에서 `selectedPosition,` 다음 줄에 추가:

```ts
  onSelectedPositionClick,
```

- [ ] **Step 3: 선택 Marker에 클릭 핸들러 연결**

기존 선택 마커 렌더 블록:

```tsx
      {selectedPosition && (
        <Marker position={[selectedPosition.lat, selectedPosition.lng]} icon={selectedLocationIcon} />
      )}
```

를 아래로 교체:

```tsx
      {selectedPosition && (
        <Marker
          position={[selectedPosition.lat, selectedPosition.lng]}
          icon={selectedLocationIcon}
          eventHandlers={onSelectedPositionClick ? { click: onSelectedPositionClick } : undefined}
        />
      )}
```

- [ ] **Step 4: 타입 체크**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/components/map-canvas.tsx
git commit -m "feat: #110 MapCanvas 선택 핀 클릭 토글(onSelectedPositionClick) 지원"
```

---

### Task 3: 홈 — 핀 표시·검색 선택·토글 제거 통합

**Files:**
- Modify: `src/features/map/components/home-map-screen.tsx`

**Interfaces:**
- Consumes: Task 2의 `onSelectedPositionClick`, MapCanvas `selectedPosition`, `useReverseGeocode`(Task 1), `Place`(name/address/lat/lng), `Coordinates`.
- Produces: 파일 로컬 타입 `SelectedLocation { lat, lng, label?, address? }`와 상태 `selectedLocation`/`setSelectedLocation`. 다음 태스크(프리필)가 `selectedLocation`과 `reverseGeocoded`를 읽어 `selectedPlace`를 파생한다.

- [ ] **Step 1: 로컬 타입 정의 추가**

`home-map-screen.tsx`에서 `function HomeMapScreen()` 선언 바로 위에 추가:

```ts
// 사용자가 홈 지도에 꽂은 단일 핀. 검색 출신은 label/address를 갖고, 지도 클릭 출신은 좌표만 갖는다.
interface SelectedLocation {
  lat: number
  lng: number
  label?: string
  address?: string
}
```

- [ ] **Step 2: clickedPosition 상태를 selectedLocation으로 교체**

기존:

```ts
  const [clickedPosition, setClickedPosition] = React.useState<Coordinates | null>(null)
```

를 교체:

```ts
  const [selectedLocation, setSelectedLocation] = React.useState<SelectedLocation | null>(null)
```

- [ ] **Step 3: 역지오코딩 대상을 "검색 핀 제외"로 변경 + 라벨 파생**

기존:

```ts
  const { data: reverseGeocoded } = useReverseGeocode(clickedPosition)
  const selectedLocationLabel = clickedPosition
    ? (reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress ?? null)
    : null
```

를 교체:

```ts
  // 검색으로 고른 핀은 이미 label/address를 가지므로 역지오코딩하지 않는다.
  // 좌표만 있는(지도 클릭) 핀에만 역지오코딩해 검색바 라벨과 프리필용 주소를 얻는다.
  const geoTarget = selectedLocation && !selectedLocation.label ? selectedLocation : null
  const { data: reverseGeocoded } = useReverseGeocode(geoTarget)
  const selectedLocationLabel = selectedLocation
    ? (selectedLocation.label ?? reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress ?? null)
    : null
```

- [ ] **Step 4: MapCanvas에 selectedPosition·토글·클릭 핀 연결**

기존 `<MapCanvas ... />` 호출에서 `onMapClick` 줄을 교체하고 `selectedPosition`·`onSelectedPositionClick`을 추가한다. 최종 형태:

```tsx
      <MapCanvas
        center={recenterTarget}
        recenterKey={recenterKey}
        animateCenter
        className="absolute inset-0 z-0 size-full"
        onMapClick={(position) => setSelectedLocation({ lat: position.lat, lng: position.lng })}
        onBoundsChange={setBounds}
        pins={pins}
        onPinClick={handlePinClick}
        livePosition={position}
        liveAccuracy={accuracy}
        selectedPosition={selectedLocation}
        onSelectedPositionClick={() => setSelectedLocation(null)}
      />
```

- [ ] **Step 5: 검색바 X 버튼을 핀 제거로 연결**

기존 `MapSearchBar`의 `onClearSelectedLocation`:

```tsx
            onClearSelectedLocation={() => setClickedPosition(null)}
```

를 교체:

```tsx
            onClearSelectedLocation={() => setSelectedLocation(null)}
```

- [ ] **Step 6: 검색 결과 선택 시 핀 꽂기**

기존 `SearchOverlay`의 `onSelectPlace`:

```tsx
          onSelectPlace={(place) => {
            setClickedPosition(null)
            recenterTo({ lat: place.lat, lng: place.lng })
            setSearchOpen(false)
          }}
```

를 교체:

```tsx
          onSelectPlace={(place) => {
            setSelectedLocation({
              lat: place.lat,
              lng: place.lng,
              label: place.name,
              address: place.address,
            })
            recenterTo({ lat: place.lat, lng: place.lng })
            setSearchOpen(false)
          }}
```

- [ ] **Step 7: 타입 체크**

Run: `pnpm typecheck`
Expected: 통과. (`Coordinates` import가 더 이상 안 쓰이면 lint에서 경고날 수 있으나, `recenterTarget`/`recenterTo`/`handleRecenter` 등에서 여전히 사용 중이라 유지된다.)

- [ ] **Step 8: 린트**

Run: `pnpm lint`
Expected: 통과(신규 경고 0).

- [ ] **Step 9: 커밋**

```bash
git add src/features/map/components/home-map-screen.tsx
git commit -m "feat: #110 검색 선택·지도 클릭을 단일 핀으로 통합 표시·토글 제거"
```

---

### Task 4: 만들기 화면 initialPlace prop 프리필 수용

**Files:**
- Modify: `src/features/meetup/hooks/use-create-meetup-form.ts`
- Modify: `src/features/meetup/components/create-meetup-screen.tsx`
- Modify: `src/features/question/components/create-question-screen.tsx`

**Interfaces:**
- Consumes: `MeetupPlaceValue { lat, lng, address, label }` (기존, `@/features/meetup/constants/create-meetup`).
- Produces:
  - `useCreateMeetupForm(initialPlace?: MeetupPlaceValue | null)` — 폼 `place` 초기값을 받는다(기본 null).
  - `CreateMeetupScreenProps.initialPlace?: MeetupPlaceValue | null`.
  - `CreateQuestionScreenProps.initialPlace?: MeetupPlaceValue | null` — create 모드에서만 초기 장소로 사용.

- [ ] **Step 1: 폼 훅이 초기 place를 받도록 수정**

`src/features/meetup/hooks/use-create-meetup-form.ts`에서 함수 시그니처와 place 초기값을 수정.

기존:

```ts
function useCreateMeetupForm() {
```

를 교체(주석 포함):

```ts
/** @param initialPlace 지도 홈 핀에서 넘어온 초기 장소(있으면 장소 칸 프리필) */
function useCreateMeetupForm(initialPlace: MeetupPlaceValue | null = null) {
```

기존:

```ts
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(null)
```

를 교체:

```ts
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(initialPlace)
```

(`MeetupPlaceValue`는 이미 이 파일에서 import 중 — 추가 import 불필요.)

- [ ] **Step 2: CreateMeetupScreen에 initialPlace prop 추가**

`src/features/meetup/components/create-meetup-screen.tsx`:

import 블록에 타입 추가(기존 `create-meetup` import 라인에 `MeetupPlaceValue`를 합류):

```ts
import {
  DEFAULT_MAX_MEMBERS,
  TITLE_MAX_LENGTH,
  formatDateValue,
  formatTimeValue,
  toKstIso,
  type MeetupPlaceValue,
} from "@/features/meetup/constants/create-meetup"
```

`interface CreateMeetupScreenProps`에 추가:

```ts
  /** 지도 홈 핀에서 넘어온 초기 장소 — 있으면 장소 칸을 프리필한다 */
  initialPlace?: MeetupPlaceValue | null
```

함수 시그니처와 폼 호출 수정. 기존:

```tsx
function CreateMeetupScreen({ onClose }: CreateMeetupScreenProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup
  const form = useCreateMeetupForm()
```

를 교체:

```tsx
function CreateMeetupScreen({ onClose, initialPlace = null }: CreateMeetupScreenProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup
  const form = useCreateMeetupForm(initialPlace)
```

- [ ] **Step 3: CreateQuestionScreen에 initialPlace prop 추가**

`src/features/question/components/create-question-screen.tsx`:

`interface CreateQuestionScreenProps`에 추가(기존 `MeetupPlaceValue` import는 이미 있음):

```ts
  /** 지도 홈 핀에서 넘어온 초기 장소 — create 모드에서 장소 칸을 프리필한다 */
  initialPlace?: MeetupPlaceValue | null
```

`CreateQuestionScreen` 시그니처와 폼 렌더에 initialPlace 전달. 기존:

```tsx
function CreateQuestionScreen({ onClose, mode = "create", questionId }: CreateQuestionScreenProps) {
```

를 교체:

```tsx
function CreateQuestionScreen({ onClose, mode = "create", questionId, initialPlace = null }: CreateQuestionScreenProps) {
```

기존 `CreateQuestionForm` 렌더(파일 끝부분 return):

```tsx
  return (
    <CreateQuestionForm onClose={onClose} mode={mode} questionId={questionId} initial={editDetail} />
  )
```

를 교체:

```tsx
  return (
    <CreateQuestionForm
      onClose={onClose}
      mode={mode}
      questionId={questionId}
      initial={editDetail}
      initialPlace={initialPlace}
    />
  )
```

- [ ] **Step 4: CreateQuestionForm이 initialPlace를 create 초기값으로 사용**

`interface CreateQuestionFormProps`에 추가:

```ts
  initialPlace: MeetupPlaceValue | null
```

`function CreateQuestionForm({ onClose, mode, questionId, initial }: ...)` 시그니처에 `initialPlace` 추가:

```tsx
function CreateQuestionForm({ onClose, mode, questionId, initial, initialPlace }: CreateQuestionFormProps) {
```

기존 place 초기 상태:

```tsx
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(
    initial
      ? {
          lat: initial.location.lat,
          lng: initial.location.lng,
          address: initial.location.address,
          label: initial.location.label ?? initial.location.address,
        }
      : null
  )
```

를 교체(마지막 `null`을 `initialPlace ?? null`로):

```tsx
  const [place, setPlace] = React.useState<MeetupPlaceValue | null>(
    initial
      ? {
          lat: initial.location.lat,
          lng: initial.location.lng,
          address: initial.location.address,
          label: initial.location.label ?? initial.location.address,
        }
      : (initialPlace ?? null)
  )
```

- [ ] **Step 5: 타입 체크**

Run: `pnpm typecheck`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/features/meetup/hooks/use-create-meetup-form.ts src/features/meetup/components/create-meetup-screen.tsx src/features/question/components/create-question-screen.tsx
git commit -m "feat: #110 모임·질문 만들기 initialPlace prop으로 장소 프리필 수용"
```

---

### Task 5: 홈 — 핀 위치를 만들기 initialPlace로 전달

**Files:**
- Modify: `src/features/map/components/home-map-screen.tsx`

**Interfaces:**
- Consumes: Task 3의 `selectedLocation`·`reverseGeocoded`, Task 4의 `CreateMeetupScreen`/`CreateQuestionScreen` `initialPlace` prop, `MeetupPlaceValue`.
- Produces: 파생값 `selectedPlace: MeetupPlaceValue | null` — 라벨·주소가 확보됐을 때만 non-null. (검색 핀은 즉시, 지도 클릭 핀은 역지오코딩 후.)

- [ ] **Step 1: MeetupPlaceValue import 추가**

`home-map-screen.tsx` import 블록에 추가:

```ts
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
```

- [ ] **Step 2: selectedPlace 파생**

`selectedLocationLabel` 정의(Task 3 Step 3) 바로 아래에 추가:

```ts
  // 만들기 화면 프리필용 값. 검색 핀은 label/address를 바로 갖고,
  // 지도 클릭 핀은 역지오코딩이 끝나야 채워진다(그 전에는 null → 프리필 안 함).
  const selectedPlaceLabel =
    selectedLocation?.label ?? reverseGeocoded?.shortLabel ?? reverseGeocoded?.fullAddress
  const selectedPlaceAddress =
    selectedLocation?.address ?? reverseGeocoded?.fullAddress ?? reverseGeocoded?.shortLabel
  const selectedPlace: MeetupPlaceValue | null =
    selectedLocation && selectedPlaceLabel && selectedPlaceAddress
      ? {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: selectedPlaceAddress,
          label: selectedPlaceLabel,
        }
      : null
```

- [ ] **Step 3: 만들기 오버레이에 initialPlace 전달**

기존:

```tsx
      {createMeetupOpen ? (
        <CreateMeetupScreen onClose={() => setCreateMeetupOpen(false)} />
      ) : null}

      {createQuestionOpen ? (
        <CreateQuestionScreen onClose={() => setCreateQuestionOpen(false)} />
      ) : null}
```

를 교체:

```tsx
      {createMeetupOpen ? (
        <CreateMeetupScreen initialPlace={selectedPlace} onClose={() => setCreateMeetupOpen(false)} />
      ) : null}

      {createQuestionOpen ? (
        <CreateQuestionScreen initialPlace={selectedPlace} onClose={() => setCreateQuestionOpen(false)} />
      ) : null}
```

- [ ] **Step 4: 타입 체크 + 린트**

Run: `pnpm typecheck && pnpm lint`
Expected: 둘 다 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/components/home-map-screen.tsx
git commit -m "feat: #110 홈 핀 위치를 모임·질문 만들기 장소로 프리필 전달"
```

---

### Task 6: 통합 빌드 + 수동 검증

**Files:** 없음(검증 전용).

- [ ] **Step 1: 프로덕션 빌드**

Run: `pnpm build`
Expected: 클린 통과(에러 0).

- [ ] **Step 2: 개발 서버 기동**

Run: `pnpm dev`
브라우저에서 지도 홈으로 이동.

- [ ] **Step 3: 검색 → 핀 시나리오**

검색바 탭 → 장소 검색 → 결과 A 탭.
Expected: 검색창 닫힘 + A에 파란 핀 표시 + 지도 A로 재중심. 검색바에 A 상호명 라벨 표시.

- [ ] **Step 4: 핀 토글 제거**

핀 재탭.
Expected: 핀 제거. 이어서 검색바 X 버튼도 핀 제거로 동작하는지 확인(핀 재생성 후 X 탭 → 제거).

- [ ] **Step 5: 지도 클릭 핀**

지도 빈 곳 클릭.
Expected: 같은 파란 핀. 검색바에 역지오코딩 주소 표시. 재탭 시 제거.

- [ ] **Step 6: 프리필 (검색 핀)**

검색으로 A 핀 → "모임 만들기" FAB.
Expected: 장소 칸에 A 상호명 프리필. (제목·날짜·시간·내용 채우면) 제출 활성. 장소 칸 탭 시 `MeetupLocationPicker`로 변경 가능. "질문하기"도 동일하게 장소 프리필 확인.

- [ ] **Step 7: 프리필 (지도 클릭 핀)**

지도 클릭 핀(역지오코딩 완료 후) → "모임 만들기".
Expected: 장소 칸에 역지오코딩 주소 프리필.

- [ ] **Step 8: 호출량 확인**

브라우저 네트워크 탭 관찰.
Expected: 검색 결과 선택·만들기 이동 시 `/api/places/reverse-geocode` 신규 호출 0. 같은 지점 반복 클릭 시 캐시 적중(추가 호출 없음).

- [ ] **Step 9: (검증 통과 시) PR 생성**

```bash
git push -u origin feat/#110
gh pr create --base develop --title "[feat] #110 검색/클릭 장소 핀 + 만들기 프리필" --body "$(cat <<'EOF'
## 요약
- 검색 결과 선택·지도 클릭을 장소선택 지도와 동일한 단일 파란 핀으로 통합 표시, 재클릭 시 제거(토글)
- 핀 위치를 모임/질문 만들기 장소에 프리필(프리필만으로 제출 활성, 수정은 선택)
- 역지오코딩 좌표 반올림 + staleTime 영구화로 호출량 방어(검색 핀은 역지오코딩 안 함)

Closes #110
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- 목표 A(검색 → 핀+재중심): Task 3 Step 4·6. ✅
- 목표 B(핀 토글 제거): Task 2 + Task 3 Step 4·5. ✅
- 목표 C(만들기 프리필): Task 4 + Task 5. ✅
- 지도 클릭·검색 핀 통합(단일 selectedPosition): Task 3. ✅
- 방어1(staleTime Infinity): Task 1. ✅
- 방어2(좌표 반올림): Task 1. ✅
- 검색 핀 역지오코딩 제외: Task 3 Step 3. ✅
- 검증 흐름: Task 6. ✅

**Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 스텝에 실제 코드 포함. ✅

**Type consistency:** `SelectedLocation`(Task 3) → `selectedLocation`/`geoTarget`/`selectedPlace`(Task 3·5)에서 일관 사용. `MeetupPlaceValue`(Task 4·5) 필드 `{lat,lng,address,label}` 동일. `onSelectedPositionClick`(Task 2 정의 → Task 3 사용) 이름 일치. `initialPlace`(Task 4 정의 → Task 5 전달) 이름·타입 일치. ✅
