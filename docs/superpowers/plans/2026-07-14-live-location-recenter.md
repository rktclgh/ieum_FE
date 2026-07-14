# 실시간 내 위치 + 위치 버튼 recenter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 지도와 모임 만들기 장소 선택 지도에서 내 위치를 항상 실시간 표시하고, 위치/GPS 버튼을 누르면 내 위치가 보이는 지도 영역 정중앙에 오도록 지도를 이동시킨다.

**Architecture:** `useGeolocation`을 `watchPosition` 기반 상시 추적으로 바꾸면 `position`이 매 틱 새 객체가 되므로, 지도 뷰 재중심을 좌표가 아니라 명시적 `recenterKey`(nonce)로 구동한다. 마커(`livePosition`)는 항상 실시간 `position`을 쓰고, 지도 이동은 최초 위치 확보/버튼 클릭/검색 선택 때만 일어난다.

**Tech Stack:** Next.js(App Router) + React + react-leaflet + Leaflet, zustand i18n, Tailwind. 패키지 매니저는 **pnpm**.

## Global Constraints

- 작업 디렉토리: **`/Users/jihye/ieum_FE/.claude/worktrees/fix-79`** (fix/#79 전용 워크트리). 공유 main 디렉토리(`/Users/jihye/ieum_FE`)는 다른 세션이 feat/#75 작업 중이므로 **절대 건드리지 않는다**. 모든 명령은 이 워크트리 안에서 실행.
- 패키지 매니저는 **pnpm** 고정 (`npm` 금지).
- 하드코딩 한국어 금지 — 새 UI 문구는 i18n 카탈로그에 추가. (이번 작업은 기존 `messages.home.locateMeLabel`="내 위치로 이동"을 그대로 재사용하므로 신규 문구 없음.)
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러 금지. 커밋 제목은 `fix: #79 ...` 형식.
- 폴더/파일명 lowercase kebab-case.
- push 전 반드시 `pnpm build` 클린. (이 계획엔 push 단계 없음 — 커밋까지만.)
- 테스트 러너가 없으므로(unit test 프레임워크 미설치) 각 태스크 검증은 `pnpm build` + `pnpm lint` + 브라우저 수동 확인으로 한다.

## File Structure

- `src/features/map/components/map-canvas.tsx` — (수정) `MapCenterUpdater`를 nonce(`recenterKey`) 구동으로 교체, null-safe, 상시 마운트. `MapCanvasProps`에 `recenterKey` 추가.
- `src/features/map/hooks/use-geolocation.ts` — (리라이트) 상시 `watchPosition`. 반환 표면 `{ position, accuracy, status, isSupported }`.
- `src/features/map/components/map-controls.tsx` — (수정) `onToggleFollow`/`isFollowing` → `onRecenter` 액션.
- `src/features/map/components/home-map-screen.tsx` — (수정) 마커 상시 표시, recenter nonce 관리, follow/드래그해제/focusedPlace 제거.
- `src/features/meetup/components/meetup-location-map.tsx` — (수정) recenter nonce 내부 관리, GPS=recenter, 인셋/마커 유지.
- `src/features/meetup/components/meetup-location-picker.tsx` — (수정) `requestLocation` 제거, `onRequestLocation` prop 제거.

각 태스크 후 `pnpm build`가 GREEN이 되도록 순서를 짰다.

---

### Task 1: MapCanvas — recenterKey nonce 재중심

**Files:**
- Modify: `src/features/map/components/map-canvas.tsx`

**Interfaces:**
- Produces: `MapCanvasProps`에 `recenterKey?: number` 추가. `center`는 `Coordinates | null` 허용(이동할 좌표). `recenterKey`가 증가할 때만 그 시점의 `center`로 이동한다. 미지정 시 재중심 안 함(기본 0).

- [ ] **Step 1: `MapCanvasProps`에 `recenterKey` 추가하고 `center` 주석 갱신**

`map-canvas.tsx`의 인터페이스에서 기존:

```tsx
interface MapCanvasProps {
  center: Coordinates | null
  /** center 변경 시 맞출 확대 단계. 없으면 현재 zoom 유지 */
  centerZoom?: number
```

를 다음으로 바꾼다(첫 두 필드만 교체, 나머지 필드는 그대로 둔다):

```tsx
interface MapCanvasProps {
  /** 재중심 시 이동할 좌표. 실시간 위치 갱신은 여기에 반영되어도 뷰를 움직이지 않는다(recenterKey로만 이동). */
  center: Coordinates | null
  /** 증가할 때마다 그 시점의 center로 지도를 이동시키는 nonce. 미지정이면 재중심 안 함 */
  recenterKey?: number
  /** center 변경 시 맞출 확대 단계. 없으면 현재 zoom 유지 */
  centerZoom?: number
```

- [ ] **Step 2: `MapCenterUpdater`를 nonce 구동 + null-safe 로 교체**

기존 `MapCenterUpdater` 함수 전체(아래 68~106행 부근)를 교체한다:

```tsx
function MapCenterUpdater({
  center,
  recenterKey,
  zoom,
  animate,
  topInset = 0,
  bottomInset = 0,
}: {
  center: Coordinates | null
  recenterKey: number
  zoom?: number
  animate?: boolean
  topInset?: number
  bottomInset?: number
}) {
  const map = useMap()
  // 최초 마운트 시점의 key를 "이미 적용됨"으로 두어, 마운트만으로는 재중심하지 않는다.
  const appliedKeyRef = React.useRef(recenterKey)

  React.useEffect(() => {
    // recenterKey가 실제로 바뀌었을 때만 이동. center 실시간 갱신/인셋 변화에는 반응하지 않는다.
    if (appliedKeyRef.current === recenterKey) return
    appliedKeyRef.current = recenterKey
    if (!center) return

    const targetZoom = zoom ?? map.getZoom()

    // 헤더·하단 시트가 지도를 가리면 그만큼 패딩을 줘, 보이는 영역의 정중앙에 오도록 flyToBounds로 이동.
    if (topInset > 0 || bottomInset > 0) {
      map.flyToBounds(L.latLngBounds([center.lat, center.lng], [center.lat, center.lng]), {
        paddingTopLeft: [0, topInset],
        paddingBottomRight: [0, bottomInset],
        maxZoom: targetZoom,
      })
    } else if (animate) {
      map.flyTo([center.lat, center.lng], targetZoom)
    } else {
      map.setView([center.lat, center.lng], targetZoom)
    }
  }, [center, recenterKey, zoom, animate, topInset, bottomInset, map])

  return null
}
```

- [ ] **Step 3: `MapCanvas` 렌더에서 MapCenterUpdater를 상시 마운트로 바꾸고 recenterKey 전달**

기존:

```tsx
      {center && (
        <MapCenterUpdater
          center={center}
          zoom={centerZoom}
          animate={animateCenter}
          topInset={topInset}
          bottomInset={bottomInset}
        />
      )}
```

를 다음으로 교체(조건 `{center && ...}` 제거, `recenterKey` 추가):

```tsx
      <MapCenterUpdater
        center={center}
        recenterKey={recenterKey ?? 0}
        zoom={centerZoom}
        animate={animateCenter}
        topInset={topInset}
        bottomInset={bottomInset}
      />
```

그리고 `MapCanvas` 함수의 구조분해 파라미터 목록에 `recenterKey`를 추가한다. 기존:

```tsx
function MapCanvas({
  center,
  centerZoom,
```

를:

```tsx
function MapCanvas({
  center,
  recenterKey,
  centerZoom,
```

- [ ] **Step 4: 빌드·린트 검증**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79 && pnpm build && pnpm lint`
Expected: 빌드/린트 통과. (이 시점엔 홈·모임이 아직 `recenterKey`를 넘기지 않아 재중심이 잠시 비활성 — 정상. 지도는 정상 렌더.)

- [ ] **Step 5: 커밋**

```bash
cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79
git add src/features/map/components/map-canvas.tsx
git commit -m "fix: #79 MapCanvas 재중심을 recenterKey nonce 구동으로 변경"
```

---

### Task 2: 홈 지도 — 상시 실시간 마커 + 위치 버튼 recenter

`useGeolocation`을 상시 watch로 리라이트하면 홈·모임이 동시에 깨진다. 이 태스크에서 홈(hook+controls+screen)을 완성하고, 모임 picker는 빌드가 깨지지 않게 **최소 스텁**(GPS 버튼 임시 no-op)만 넣는다. 모임 완성은 Task 3.

**Files:**
- Rewrite: `src/features/map/hooks/use-geolocation.ts`
- Modify: `src/features/map/components/map-controls.tsx`
- Modify: `src/features/map/components/home-map-screen.tsx`
- Modify(스텁): `src/features/meetup/components/meetup-location-picker.tsx`

**Interfaces:**
- Produces: `useGeolocation(): { position: Coordinates | null; accuracy: number | null; status: "loading"|"success"|"error"; isSupported: boolean }`. `Coordinates`/`GeolocationStatus` 타입은 계속 이 파일에서 export.
- Produces: `MapControlsProps { onRecenter: () => void; onCreateMeetup?; onCreateQuestion?; className? }`.
- Consumes(Task 1): `MapCanvas`의 `recenterKey?: number`, `center: Coordinates | null`.

- [ ] **Step 1: `use-geolocation.ts` 전체 리라이트 (상시 watch)**

파일 전체를 다음으로 교체:

```tsx
"use client"

import * as React from "react"

interface Coordinates {
  lat: number
  lng: number
}

type GeolocationStatus = "loading" | "success" | "error"

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 1_000,
}

// 마운트 시 watchPosition으로 내 위치를 실시간 추적한다. 언마운트 시 clearWatch(배터리 소모 방지).
// position은 갱신마다 새 객체가 되므로 지도 뷰 재중심에 직접 쓰면 안 된다 — MapCanvas recenterKey로만 이동한다.
function useGeolocation() {
  const [position, setPosition] = React.useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<GeolocationStatus>("loading")

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  React.useEffect(() => {
    if (!isSupported) {
      setStatus("error")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setAccuracy(result.coords.accuracy)
        setStatus("success")
      },
      () => setStatus("error"),
      GEOLOCATION_OPTIONS
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [isSupported])

  return { position, accuracy, status, isSupported }
}

export { useGeolocation }
export type { Coordinates, GeolocationStatus }
```

- [ ] **Step 2: `map-controls.tsx` 전체 교체 (recenter 액션)**

파일 전체를 다음으로 교체:

```tsx
"use client"

import { Circle } from "@/components/ui/circle"
import { MapFab } from "@/features/map/components/map-fab"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapControlsProps {
  onRecenter: () => void
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  className?: string
}

function MapControls({ onRecenter, onCreateMeetup, onCreateQuestion, className }: MapControlsProps) {
  const { messages } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Circle
        iconSrc="/icons/circle/location.svg"
        aria-label={messages.home.locateMeLabel}
        onClick={onRecenter}
      />
      <Circle iconSrc="/icons/circle/list.svg" aria-label={messages.home.listViewLabel} />
      <MapFab onCreateMeetup={onCreateMeetup} onCreateQuestion={onCreateQuestion} />
    </div>
  )
}

export { MapControls }
```

- [ ] **Step 3: `home-map-screen.tsx` — hook 사용/마커/recenter 배선 수정**

3-a. hook 구조분해를 바꾼다. 기존:

```tsx
  const { position, accuracy, isFollowing, toggleFollow, stopFollow } = useGeolocation()
  const [focusedPlace, setFocusedPlace] = React.useState<Place | null>(null)
```

를:

```tsx
  const { position, accuracy } = useGeolocation()
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
```

3-b. `handlePinClick` 정의 바로 아래의 follow 핸들러와 `center` 계산을 교체한다. 기존:

```tsx
  // follow-me 토글: 켤 때는 검색/클릭 선택을 비워 지도가 내 위치를 따라가게 한다.
  const handleToggleFollow = React.useCallback(() => {
    if (!isFollowing) {
      setFocusedPlace(null)
      setClickedPosition(null)
    }
    toggleFollow()
  }, [isFollowing, toggleFollow])

  const center = focusedPlace ? { lat: focusedPlace.lat, lng: focusedPlace.lng } : position
```

를 다음으로 교체:

```tsx
  // 지도 뷰 이동은 recenterKey(nonce)로만 구동한다. target을 정하고 key를 올리면 그 좌표로 이동.
  const recenterTo = React.useCallback((target: Coordinates) => {
    setRecenterTarget(target)
    setRecenterKey((key) => key + 1)
  }, [])

  // 최초 위치 확보 1회: 내 위치로 자동 중심 이동.
  const hasCenteredRef = React.useRef(false)
  React.useEffect(() => {
    if (hasCenteredRef.current || !position) return
    hasCenteredRef.current = true
    recenterTo(position)
  }, [position, recenterTo])

  // 위치 버튼: 현재 내 위치를 화면 정중앙으로.
  const handleRecenter = React.useCallback(() => {
    if (position) recenterTo(position)
  }, [position, recenterTo])
```

3-c. `MapCanvas` 사용 부분을 교체한다. 기존:

```tsx
      <MapCanvas
        center={center}
        className="absolute inset-0 z-0 size-full"
        onMapClick={(position) => {
          setFocusedPlace(null)
          setClickedPosition(position)
        }}
        onBoundsChange={setBounds}
        pins={pins}
        onPinClick={handlePinClick}
        livePosition={isFollowing ? position : null}
        liveAccuracy={isFollowing ? accuracy : null}
        onUserPan={isFollowing ? stopFollow : undefined}
      />
```

를:

```tsx
      <MapCanvas
        center={recenterTarget}
        recenterKey={recenterKey}
        animateCenter
        className="absolute inset-0 z-0 size-full"
        onMapClick={(position) => setClickedPosition(position)}
        onBoundsChange={setBounds}
        pins={pins}
        onPinClick={handlePinClick}
        livePosition={position}
        liveAccuracy={accuracy}
      />
```

3-d. 검색 선택 핸들러(`MapSearchBar`의 `onSelectPlace`)를 교체한다. 기존:

```tsx
            onSelectPlace={(place) => {
              setClickedPosition(null)
              setFocusedPlace(place)
            }}
```

를:

```tsx
            onSelectPlace={(place) => {
              setClickedPosition(null)
              recenterTo({ lat: place.lat, lng: place.lng })
            }}
```

3-e. `MapControls` 사용부를 교체한다. 기존:

```tsx
      <MapControls
        onToggleFollow={handleToggleFollow}
        isFollowing={isFollowing}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />
```

를:

```tsx
      <MapControls
        onRecenter={handleRecenter}
        onCreateMeetup={() => setCreateMeetupOpen(true)}
        onCreateQuestion={() => setCreateQuestionOpen(true)}
        className="absolute right-4 bottom-28 z-10 flex flex-col gap-2"
      />
```

- [ ] **Step 4: 스텁 — `meetup-location-picker.tsx`가 빌드되도록 최소 수정**

Task 3에서 제대로 고치기 전, 제거된 `requestLocation` 참조로 빌드가 깨지지 않게 임시 처리한다. 기존:

```tsx
  const { position, requestLocation } = useGeolocation()
```

를:

```tsx
  const { position } = useGeolocation()
```

그리고 `MeetupLocationMap` 사용부의 기존:

```tsx
          onRequestLocation={requestLocation}
```

를 임시로:

```tsx
          onRequestLocation={() => {}}
```

(모임 GPS 버튼은 이 태스크 시점엔 no-op — Task 3에서 실제 recenter로 대체.)

- [ ] **Step 5: 빌드·린트 검증**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79 && pnpm build && pnpm lint`
Expected: 통과. 사용하지 않는 import(`Place` 타입이 여전히 `onSelectPlace` 콜백 인자로 쓰이면 유지) 경고 없음. 만약 `Place` import가 미사용으로 잡히면 확인 — `MapSearchBar onSelectPlace(place: Place)` 콜백에서 `place`를 쓰므로 타입은 계속 필요.

- [ ] **Step 6: 홈 수동 확인**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79 && pnpm dev` (다른 포트로 뜸 — 3000 사용 중이면 자동 3001 등)
확인 항목(홈 `/`):
1. 진입하면 잠시 후 파란 점(내 위치 마커)이 **버튼을 안 눌러도** 보이고, 지도 중심이 내 위치로 1회 이동한다.
2. 지도를 드래그해 이동해도 마커는 유지되고 지도가 자동으로 되돌아오지 않는다(추적 해제 개념 없음).
3. 우하단 위치 버튼을 누르면 내 위치가 화면 정중앙으로 부드럽게 이동한다.
4. 위치 버튼에 눌림(outline) 상태가 생기지 않는다.

- [ ] **Step 7: 커밋**

```bash
cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79
git add src/features/map/hooks/use-geolocation.ts \
        src/features/map/components/map-controls.tsx \
        src/features/map/components/home-map-screen.tsx \
        src/features/meetup/components/meetup-location-picker.tsx
git commit -m "fix: #79 홈 지도 상시 실시간 마커 + 위치 버튼 recenter"
```

---

### Task 3: 모임 장소 선택 — 실시간 추적 + drawer 제외 중심 recenter

**Files:**
- Modify: `src/features/meetup/components/meetup-location-map.tsx`
- Modify: `src/features/meetup/components/meetup-location-picker.tsx`

**Interfaces:**
- Consumes: `useGeolocation()`(Task 2)의 `position`, `MapCanvas`(Task 1)의 `recenterKey`/`center`.
- Produces: `MeetupLocationMapProps`에서 `onRequestLocation` 제거(나머지 props 유지).

- [ ] **Step 1: `meetup-location-map.tsx` — `onRequestLocation` prop 제거**

props 인터페이스에서 다음 두 줄을 삭제한다:

```tsx
  /** GPS 재조회 요청 */
  onRequestLocation: () => void
```

그리고 함수 구조분해에서 `onRequestLocation,` 를 삭제한다. 기존:

```tsx
function MeetupLocationMap({
  position,
  onRequestLocation,
  onBack,
```

를:

```tsx
function MeetupLocationMap({
  position,
  onBack,
```

- [ ] **Step 2: recenter nonce 상태 도입 + GPS 핸들러 교체**

기존 center/target 계산과 `handleGps`:

```tsx
  // 내 위치가 지도 중심. 사용자가 팬해도 position 식별자가 그대로라 되돌아가지 않고,
  // GPS 탭(위치 재조회) 시에만 position이 새 객체로 바뀌어 flyTo 애니메이션이 실행된다.
  const center = position
  const target = clicked ?? position

  const handleGps = () => onRequestLocation()
```

를 다음으로 교체:

```tsx
  // 지도 뷰 이동은 recenterKey(nonce)로만 구동한다. position은 실시간 갱신되어도 뷰를 움직이지 않는다.
  const [recenterTarget, setRecenterTarget] = React.useState<Coordinates | null>(null)
  const [recenterKey, setRecenterKey] = React.useState(0)
  const recenterTo = React.useCallback((t: Coordinates) => {
    setRecenterTarget(t)
    setRecenterKey((key) => key + 1)
  }, [])

  // 최초 위치 확보 1회: 내 위치로 자동 중심 이동.
  const hasCenteredRef = React.useRef(false)
  React.useEffect(() => {
    if (hasCenteredRef.current || !position) return
    hasCenteredRef.current = true
    recenterTo(position)
  }, [position, recenterTo])

  // 역지오코딩·주변 검색 기준점: 지도에서 고른 지점 우선, 없으면 내 위치.
  const target = clicked ?? position

  // GPS 버튼: 내 위치를 drawer/헤더 제외한 보이는 영역 정중앙으로.
  const handleGps = () => {
    if (position) recenterTo(position)
  }
```

- [ ] **Step 3: `MapCanvas` 사용부의 center/recenterKey 반영**

기존:

```tsx
      <MapCanvas
        center={center}
        centerZoom={DEFAULT_MAP_ZOOM}
        animateCenter
        topInset={topInset}
        bottomInset={bottomInset}
        className="absolute inset-0 z-0 size-full"
        onMapClick={setClicked}
        livePosition={position}
        selectedPosition={clicked}
      />
```

를:

```tsx
      <MapCanvas
        center={recenterTarget}
        recenterKey={recenterKey}
        centerZoom={DEFAULT_MAP_ZOOM}
        animateCenter
        topInset={topInset}
        bottomInset={bottomInset}
        className="absolute inset-0 z-0 size-full"
        onMapClick={setClicked}
        livePosition={position}
        selectedPosition={clicked}
      />
```

- [ ] **Step 4: `meetup-location-picker.tsx` — 스텁 제거**

Task 2에서 넣은 임시 `onRequestLocation={() => {}}` 줄을 삭제한다. 기존:

```tsx
        <MeetupLocationMap
          position={position}
          onRequestLocation={() => {}}
          onBack={onClose}
```

를:

```tsx
        <MeetupLocationMap
          position={position}
          onBack={onClose}
```

- [ ] **Step 5: 빌드·린트 검증**

Run: `cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79 && pnpm build && pnpm lint`
Expected: 통과.

- [ ] **Step 6: 모임 장소 선택 수동 확인**

`pnpm dev`로 띄운 뒤, 홈 우하단 FAB → 모임 만들기 → 장소 선택 진입.
확인 항목:
1. 진입 시 파란 점(내 위치)이 보이고 실시간 갱신된다(버튼 없이).
2. GPS 버튼(우하단, 하단 리스트 위)을 누르면 내 위치가 **하단 리스트·상단 검색바를 제외한 보이는 지도 영역의 정중앙**으로 이동한다(리스트에 가려지지 않음).
3. 지도에서 임의 지점을 탭하면 파란 물방울 핀이 찍히고 그 주소가 하단 목록 상단에 뜬다(재중심되지 않음).
4. Figma(node 1716-12206)와 레이아웃 동일 — 시각 변화 없음.

- [ ] **Step 7: 커밋**

```bash
cd /Users/jihye/ieum_FE/.claude/worktrees/fix-79
git add src/features/meetup/components/meetup-location-map.tsx \
        src/features/meetup/components/meetup-location-picker.tsx
git commit -m "fix: #79 모임 장소 선택 실시간 추적 + drawer 제외 중심 recenter"
```

---

## Self-Review

**Spec coverage:**
- 상시 실시간 마커 → Task 2(홈), Task 3(모임): `livePosition={position}` 상시, hook 상시 watch. ✅
- 실시간 갱신이 뷰를 안 따라감 → Task 1 nonce(`appliedKeyRef` 가드로 center 변경 무시). ✅
- 위치 버튼=일회성 recenter, 토글/outline 제거 → Task 2 map-controls/home. ✅
- 홈 정중앙 / 모임 drawer 제외 중심 → 홈은 인셋 미전달(기본 0), 모임은 topInset/bottomInset 유지 + flyToBounds. ✅
- 최초 fix 1회 auto-center → 두 화면 `hasCenteredRef` 이펙트. ✅
- 모임 시각 변경 없음 → Task 3는 로직만. ✅
- 독립성/워크트리 → Global Constraints. ✅

**Placeholder scan:** 모든 스텝에 실제 코드 포함, TBD/TODO 없음. Task 2 Step 4는 의도된 임시 스텁이며 Task 3 Step 4에서 제거됨(명시). ✅

**Type consistency:** `recenterTo(target: Coordinates)`, `recenterKey: number`, `recenterTarget: Coordinates | null`, `MapCanvasProps.recenterKey?: number`, `MapControlsProps.onRecenter`, `useGeolocation` 반환 `{ position, accuracy, status, isSupported }` — 태스크 간 일치. `hasCenteredRef`/`appliedKeyRef` 명명 일관. ✅
