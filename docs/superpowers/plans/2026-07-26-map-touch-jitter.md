# 지도 터치감/위치 떨림 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **최종 결과 업데이트 (2026-07-26)**: Task 1(zoomSnap)은 줌아웃을 깨뜨려 롤백했고, Task 4·5(내 위치
> 점 보간 애니메이션)는 #493(MapLibre GL 마커 마이그레이션) 자체를 되돌리면서 함께 제거됐다(마커가
> Leaflet DOM 마커로 복귀해 MapLibre GL 소스에 대한 보간이 더는 적용되지 않음). Task 2·3(GPS 필터)만
> 최종 채택되어 유지된다. 드래그/핀치줌 진동의 실제 원인과 최종 해법은 이슈 #507·PR #508 참고.

**Goal:** 지도의 내 위치 점(GPS dot)이 이동 중 위아래로 떨리는 문제와, 드래그·핀치줌 터치 후 지도가 딱 멈추지 않고 떨리는 문제를 해결한다.

**Architecture:** (1) `use-geolocation`의 `watchPosition` 콜백에 정확도/최소이동거리 필터를 추가해 노이즈 낀 GPS fix를 걸러내고, (2) `use-marker-layers`의 내 위치 소스 갱신을 즉시 스냅에서 짧은 rAF 보간 애니메이션으로 바꾸며, (3) `MapCanvas`의 `MapContainer`에 `zoomSnap`/`zoomDelta`를 소수 단위로 설정해 핀치줌 종료 시 정수 줌으로 튀는 점프를 없앤다. 세 항목 모두 `home-map-screen.tsx`/`meetup-location-map.tsx` 양쪽이 공유하는 `MapCanvas` 계층에서 이뤄지므로 한 번의 수정으로 두 화면에 모두 적용된다.

**Tech Stack:** Next.js(App Router) + Leaflet(react-leaflet) + MapLibre GL(`@maplibre/maplibre-gl-leaflet`), Node.js `node:test`/`node:assert` 기반 유닛 테스트.

## Global Constraints
- 모든 폴더/파일명은 kebab-case.
- 하드코딩 한글 UI 문자열 금지 — 이 작업은 UI 문구를 추가하지 않으므로 해당 없음.
- 새 라이브러리 파일은 이 디렉터리의 기존 관례(상대 경로 import, 소스는 확장자 없이 / 테스트는 `.ts` 확장자 + `@ts-expect-error` 주석)를 따른다 (`src/features/map/lib/distance.ts`, `distance.test.ts` 참고).
- 테스트 파일은 만들었다고 자동으로 CI에 편입되지 않는다 — `scripts/ci/test-client-contracts.sh`에 실행 줄을 직접 추가해야 `pnpm test:contracts`/`pnpm verify`가 돌린다.
- 로컬 기본 node가 v20이라 `pnpm test:contracts`는 항상 별개 이유로 깨질 수 있다 — 새 테스트는 `node --experimental-strip-types --test <path>`로 개별 실행해 통과를 확인한다 (nvm으로 v22 사용 시 `pnpm test:contracts` 전체도 가능).
- 코드 변경 완료 후에도 "완료"로 보고하지 않는다 — 이 버그는 실제 터치/이동 없이는 재현·검증이 불가능하므로, 사용자의 실기기(또는 실행 중인 dev 서버에서의 실제 터치) 확인이 완료 기준이다.

---

### Task 1: 핀치줌 종료 후 정수 줌 스냅 점프 제거

**Files:**
- Modify: `src/features/map/components/map-canvas.tsx:494-502` (`MapContainer` JSX)

**Interfaces:**
- Consumes: 없음 (react-leaflet `MapContainer`의 기존 `zoomSnap`/`zoomDelta` prop 사용)
- Produces: 없음 (설정값 변경, 다른 태스크가 의존하지 않음)

- [ ] **Step 1: `zoomSnap`/`zoomDelta`를 `MapContainer`에 추가**

`src/features/map/components/map-canvas.tsx`의 `MapContainer` 엘리먼트를 다음과 같이 수정한다 (기존 `zoom={DEFAULT_MAP_ZOOM}` 줄 바로 아래):

```tsx
    <MapContainer
      key={mapContainerKey}
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      // 핀치줌은 연속(소수점) 확대인데 기본값(zoomSnap:1)은 제스처 종료 시 가장 가까운
      // 정수 줌으로 강제 스냅하며 지도 중심이 한 번에 튄다. 소수 단위로 낮춰 이 점프를 없앤다.
      zoomSnap={0.25}
      zoomDelta={0.5}
      zoomControl={false}
      attributionControl={false}
      className={className}
    >
```

- [ ] **Step 2: 타입체크로 prop이 유효한지 확인**

Run: `pnpm typecheck`
Expected: 에러 없음 (react-leaflet의 `MapContainerProps`는 Leaflet `MapOptions`를 확장하므로 `zoomSnap`/`zoomDelta`가 이미 타입에 있다)

- [ ] **Step 3: 커밋**

```bash
git add src/features/map/components/map-canvas.tsx
git commit -m "fix: 핀치줌 종료 시 정수 줌으로 튀는 점프 제거 (zoomSnap 조정)"
```

---

### Task 2: GPS fix 수락 여부를 판단하는 순수 필터 함수

**Files:**
- Create: `src/features/map/lib/live-position-filter.ts`
- Test: `src/features/map/lib/live-position-filter.test.ts`

**Interfaces:**
- Consumes: `haversineMeters` from `src/features/map/lib/distance.ts` (기존, 시그니처 `(a: LatLng, b: LatLng) => number`), `LatLng` type from `src/features/map/lib/coordinate-precision.ts`
- Produces: `shouldAcceptLiveFix(previous: LatLng | null, next: LiveFix): boolean`, `MAX_ACCEPTABLE_ACCURACY_METERS`, `MIN_MOVEMENT_METERS` — Task 3(`use-geolocation.ts`)이 그대로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/map/lib/live-position-filter.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { shouldAcceptLiveFix, MAX_ACCEPTABLE_ACCURACY_METERS, MIN_MOVEMENT_METERS } from "./live-position-filter.ts"

const BASE = { lat: 37.5665, lng: 126.978 }

test("이전 좌표가 없으면(최초 fix) 정확도와 무관하게 항상 수락한다", () => {
  assert.equal(
    shouldAcceptLiveFix(null, { lat: 37.6, lng: 127.0, accuracyMeters: 999 }),
    true
  )
})

test("정확도가 임계값보다 나쁜 fix는 거부한다", () => {
  const next = { lat: BASE.lat + 0.001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS + 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), false)
})

test("정확도가 임계값 이내라도 최소 이동거리 미만이면 거부한다", () => {
  // 위도 0.00001도 ≈ 1.1m — MIN_MOVEMENT_METERS(5m)보다 작은 이동
  const next = { lat: BASE.lat + 0.00001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS - 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), false)
})

test("정확도가 좋고 최소 이동거리 이상이면 수락한다", () => {
  // 위도 0.0001도 ≈ 11m — MIN_MOVEMENT_METERS(5m) 이상
  const next = { lat: BASE.lat + 0.0001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS - 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), true)
})

test("정확도 경계값(임계값과 정확히 같음)은 수락한다", () => {
  const next = { lat: BASE.lat + 0.0001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS }
  assert.equal(shouldAcceptLiveFix(BASE, next), true)
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --experimental-strip-types --test src/features/map/lib/live-position-filter.test.ts`
Expected: FAIL (`live-position-filter.ts` 모듈이 없음 — `ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: 최소 구현 작성**

`src/features/map/lib/live-position-filter.ts`:

```ts
import { haversineMeters } from "./distance"
import type { LatLng } from "./coordinate-precision"

/** 이보다 오차 반경이 큰 fix는 위치 갱신에 반영하지 않는다. */
const MAX_ACCEPTABLE_ACCURACY_METERS = 30

/** 이전에 반영한 좌표에서 이 거리(m) 미만으로 움직인 fix는 갱신하지 않는다 —
 * 정지 상태에서도 발생하는 GPS 자연 흔들림을 걸러낸다. */
const MIN_MOVEMENT_METERS = 5

interface LiveFix extends LatLng {
  accuracyMeters: number
}

/**
 * watchPosition의 새 fix를 위치 상태에 반영할지 결정한다.
 * 최초 fix(previous가 없을 때)는 정확도와 무관하게 항상 반영한다 — 그렇지 않으면
 * 신호가 나쁜 곳(실내 등)에서 최초 위치를 영영 못 받아 로딩에서 벗어나지 못한다.
 */
function shouldAcceptLiveFix(previous: LatLng | null, next: LiveFix): boolean {
  if (!previous) return true
  if (next.accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) return false
  return haversineMeters(previous, next) >= MIN_MOVEMENT_METERS
}

export { shouldAcceptLiveFix, MAX_ACCEPTABLE_ACCURACY_METERS, MIN_MOVEMENT_METERS }
export type { LiveFix }
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --experimental-strip-types --test src/features/map/lib/live-position-filter.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/lib/live-position-filter.ts src/features/map/lib/live-position-filter.test.ts
git commit -m "feat: GPS fix 정확도/최소이동거리 필터 함수 추가"
```

---

### Task 3: `use-geolocation`에 필터 적용

**Files:**
- Modify: `src/features/map/hooks/use-geolocation.ts:47-74` (watchPosition 콜백)

**Interfaces:**
- Consumes: `shouldAcceptLiveFix` from Task 2 (`src/features/map/lib/live-position-filter.ts`)
- Produces: 없음 (훅의 외부 시그니처 `{ position, status, initialStatus, isSupported }`는 변경 없음 — Task 5까지 그대로 사용)

- [ ] **Step 1: 수락된 마지막 좌표를 추적하는 ref 추가, 콜백에 필터 적용**

`src/features/map/hooks/use-geolocation.ts`를 다음과 같이 수정한다.

`function useGeolocation` 내부, `const [position, setPosition] = ...` 바로 아래에 ref 추가:

```ts
  const [position, setPosition] = React.useState<Coordinates | null>(seededPosition)
  // shouldAcceptLiveFix가 "이전 좌표"로 비교할 마지막 수락 좌표. state는 effect 밖 콜백에서
  // stale하게 캡처되므로(watchPosition 구독은 마운트 시 1회) ref로 최신값을 유지한다.
  const positionRef = React.useRef(seededPosition)
```

`watchPosition` 콜백을 다음으로 교체:

```ts
    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        const next = { lat: result.coords.latitude, lng: result.coords.longitude }
        setStatus("success")
        setInitialStatus((currentStatus) =>
          resolveInitialGeolocationStatus(currentStatus, { type: "success" })
        )

        if (!shouldAcceptLiveFix(positionRef.current, { ...next, accuracyMeters: result.coords.accuracy })) {
          return
        }

        // 다음 마운트가 곧바로 출발할 수 있도록 남긴다. timestamp는 측위 시각이라 나이 계산에 맞다.
        rememberPosition(next, result.timestamp)
        positionRef.current = next
        setPosition(next)
      },
      (error) => {
        setStatus("error")
        setInitialStatus((currentStatus) =>
          resolveInitialGeolocationStatus(currentStatus, {
            type: "error",
            errorCode: error.code,
          })
        )
      },
      GEOLOCATION_OPTIONS
    )
```

(상태/초기상태 갱신은 필터 통과 여부와 무관하게 항상 실행 — GPS 자체는 정상 동작 중이므로. 위치만 조건부로 갱신한다.)

파일 상단 import에 추가:

```ts
import { shouldAcceptLiveFix } from "@/features/map/lib/live-position-filter"
```

- [ ] **Step 2: 타입체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `pnpm lint`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/features/map/hooks/use-geolocation.ts
git commit -m "fix: watchPosition에 정확도/최소이동거리 필터 적용"
```

---

### Task 4: 좌표 보간(lerp) + easing 순수 함수

**Files:**
- Create: `src/features/map/lib/point-interpolation.ts`
- Test: `src/features/map/lib/point-interpolation.test.ts`

**Interfaces:**
- Consumes: `LatLng` type from `src/features/map/lib/coordinate-precision.ts`
- Produces: `lerpLatLng(start: LatLng, end: LatLng, t: number): LatLng`, `easeOutCubic(t: number): number` — Task 5(`use-marker-layers.ts`)가 그대로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/map/lib/point-interpolation.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { lerpLatLng, easeOutCubic } from "./point-interpolation.ts"

test("t=0이면 시작점을 반환한다", () => {
  const start = { lat: 37.5, lng: 127.0 }
  const end = { lat: 37.6, lng: 127.1 }
  assert.deepEqual(lerpLatLng(start, end, 0), start)
})

test("t=1이면 끝점을 반환한다", () => {
  const start = { lat: 37.5, lng: 127.0 }
  const end = { lat: 37.6, lng: 127.1 }
  assert.deepEqual(lerpLatLng(start, end, 1), end)
})

test("t=0.5면 중간 지점을 반환한다", () => {
  const start = { lat: 0, lng: 0 }
  const end = { lat: 10, lng: 20 }
  assert.deepEqual(lerpLatLng(start, end, 0.5), { lat: 5, lng: 10 })
})

test("easeOutCubic(0)은 0이다", () => {
  assert.equal(easeOutCubic(0), 0)
})

test("easeOutCubic(1)은 1이다", () => {
  assert.equal(easeOutCubic(1), 1)
})

test("easeOutCubic은 처음(0→0.5 구간)이 나중(0.5→1 구간)보다 더 많이 진행한다 (ease-out 특성)", () => {
  const firstHalf = easeOutCubic(0.5) - easeOutCubic(0)
  const secondHalf = easeOutCubic(1) - easeOutCubic(0.5)
  assert.ok(firstHalf > secondHalf, `expected first half (${firstHalf}) > second half (${secondHalf})`)
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --experimental-strip-types --test src/features/map/lib/point-interpolation.test.ts`
Expected: FAIL (`point-interpolation.ts` 모듈이 없음)

- [ ] **Step 3: 최소 구현 작성**

`src/features/map/lib/point-interpolation.ts`:

```ts
import type { LatLng } from "./coordinate-precision"

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function lerpLatLng(start: LatLng, end: LatLng, t: number): LatLng {
  return { lat: lerp(start.lat, end.lat, t), lng: lerp(start.lng, end.lng, t) }
}

// 전역 모션 표준(`--ease-base: cubic-bezier(0.32, 0.72, 0, 1)`, app/globals.css)이 CSS 전용이라
// GL 포인트 좌표 보간(rAF 루프) 안에서는 쓸 수 없다. 같은 "빠르게 시작해 부드럽게 멈추는"
// ease-out 특성을 갖는 3차 함수로 근사한다.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export { lerpLatLng, easeOutCubic }
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --experimental-strip-types --test src/features/map/lib/point-interpolation.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/lib/point-interpolation.ts src/features/map/lib/point-interpolation.test.ts
git commit -m "feat: 좌표 보간/easing 순수 함수 추가"
```

---

### Task 5: 내 위치 점을 즉시 스냅 대신 짧게 보간 이동

**Files:**
- Modify: `src/features/map/hooks/use-marker-layers.ts:250-256` (내 위치 소스 effect)

**Interfaces:**
- Consumes: `lerpLatLng`, `easeOutCubic` from Task 4 (`src/features/map/lib/point-interpolation.ts`)
- Produces: 없음 (훅 외부 시그니처 변경 없음)

- [ ] **Step 1: import 추가**

`src/features/map/hooks/use-marker-layers.ts` 상단 import 블록에 추가:

```ts
import { easeOutCubic, lerpLatLng } from "@/features/map/lib/point-interpolation"
```

- [ ] **Step 2: 지속시간 상수 + 애니메이션 상태 ref 추가**

`EMPTY_FEATURE_COLLECTION` 선언 바로 아래에 추가:

```ts
// 전역 모션 표준과 동일한 300ms(app/globals.css의 --motion-duration-base)를 써서
// 다른 지도 전환 애니메이션과 속도감이 어긋나지 않게 한다.
const LIVE_POSITION_TRANSITION_MS = 300
```

`useMarkerLayers` 함수 내부, 기존 `imageCacheRef` 선언 근처에 추가:

```ts
  // 내 위치 점이 매 GPS 갱신마다 즉시 스냅하지 않고 짧게 보간 이동하도록 진행 상태를 담는다.
  const liveAnimationRef = React.useRef<{ raf: number | null; current: Coordinates | null }>({
    raf: null,
    current: null,
  })
```

- [ ] **Step 3: 효과 3(내 위치 소스)을 보간 애니메이션으로 교체**

기존:

```ts
  // 3) 내 위치 소스.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(USER_LOCATION_SOURCE_ID)
    if (!source) return
    source.setData(pointFeatureCollection(livePosition))
  }, [glMap, livePosition])
```

다음으로 교체:

```ts
  // 3) 내 위치 소스. setData는 보간 없이 즉시 스냅하므로(MapLibre GL 특성), 노이즈 섞인 GPS
  // 갱신이 그대로 순간이동으로 보여 떨림처럼 느껴진다. 매 갱신을 rAF로 짧게 보간해 이동시킨다.
  // 중간에 새 좌표가 도착하면(진행 중인 애니메이션을 취소하고) 그 시점의 화면상 위치(state.current)
  // 에서 새 목표로 이어서 보간한다 — 매번 예전 시작점으로 되돌아가 재생하면 오히려 더 떨어 보인다.
  React.useEffect(() => {
    if (!glMap) return
    const source = glMap.getSource<GeoJSONSource>(USER_LOCATION_SOURCE_ID)
    if (!source) return

    const state = liveAnimationRef.current
    if (state.raf !== null) {
      cancelAnimationFrame(state.raf)
      state.raf = null
    }

    if (!livePosition) {
      source.setData(EMPTY_FEATURE_COLLECTION)
      state.current = null
      return
    }

    const start = state.current
    if (!start) {
      // 최초 표시(진입 시점)는 애니메이션 없이 바로 스냅한다.
      source.setData(pointFeatureCollection(livePosition))
      state.current = livePosition
      return
    }

    const target = livePosition
    const startTime = performance.now()

    const step = (now: number) => {
      const t = Math.min((now - startTime) / LIVE_POSITION_TRANSITION_MS, 1)
      const point = lerpLatLng(start, target, easeOutCubic(t))
      source.setData(pointFeatureCollection(point))
      state.current = point
      state.raf = t < 1 ? requestAnimationFrame(step) : null
    }

    state.raf = requestAnimationFrame(step)

    return () => {
      if (state.raf !== null) {
        cancelAnimationFrame(state.raf)
        state.raf = null
      }
    }
  }, [glMap, livePosition])
```

- [ ] **Step 4: 타입체크 + 린트**

Run: `pnpm typecheck && pnpm lint`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/features/map/hooks/use-marker-layers.ts
git commit -m "fix: 내 위치 점을 즉시 스냅 대신 300ms 보간 이동으로 표시"
```

---

### Task 6: 새 테스트를 CI 계약 테스트 러너에 등록

**Files:**
- Modify: `scripts/ci/test-client-contracts.sh:44` (기존 `distance.test.ts` 등록 줄 다음)

**Interfaces:**
- Consumes: Task 2, Task 4가 만든 테스트 파일 경로
- Produces: 없음

- [ ] **Step 1: 두 줄 추가**

`scripts/ci/test-client-contracts.sh`에서 다음 줄:

```bash
node --experimental-strip-types --test src/features/map/lib/distance.test.ts
```

바로 다음에 추가:

```bash
node --experimental-strip-types --test src/features/map/lib/live-position-filter.test.ts
node --experimental-strip-types --test src/features/map/lib/point-interpolation.test.ts
```

- [ ] **Step 2: 스크립트 단독 실행으로 확인** (Node 22 필요 — 로컬 기본이 v20이면 `nvm use 22` 먼저)

Run: `bash scripts/ci/test-map-contracts.sh` 는 별개 스크립트이므로 대상 아님. 대신:
```bash
node --experimental-strip-types --test src/features/map/lib/distance.test.ts src/features/map/lib/live-position-filter.test.ts src/features/map/lib/point-interpolation.test.ts
```
Expected: 3개 파일 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add scripts/ci/test-client-contracts.sh
git commit -m "test: 새 지도 라이브러리 테스트를 CI 계약 테스트에 등록"
```

---

### Task 7: 전체 검증 + 실기기/실브라우저 확인

**Files:** 없음 (검증 전용 태스크)

**Interfaces:** 없음

- [ ] **Step 1: 정적 검증**

Run:
```bash
pnpm lint
pnpm typecheck
pnpm build
```
Expected: 모두 클린 통과. (`pnpm test:contracts`는 로컬 Node 버전 문제로 이 항목과 무관하게 실패할 수 있음 — Node 22로 개별 확인했다면 충분)

- [ ] **Step 2: 실행 중인 dev 서버(포트 3000)에서 실제 확인**

이미 `localhost:3000`에 떠 있는 dev 서버를 새로고침한 뒤:
- 핀치줌으로 확대/축소 후 손을 뗐을 때 지도 중심이 튀지 않는지 확인 (문제 2)
- 드래그로 팬 후 손을 뗐을 때 매끄럽게 멈추는지 확인 — 여전히 떨리면 문제 3(관성 파라미터)이 남은 것
- (가능하면) 걸어서 이동하며 홈 지도의 내 위치 점이 순간이동 대신 부드럽게 이어지는지 확인 (문제 1)

- [ ] **Step 3: 문제 3(관성 떨림)이 Step 2에서 여전히 재현되면**

`src/features/map/components/map-canvas.tsx`의 `MapContainer`에 다음을 추가해 재확인한다:

```tsx
      inertiaDeceleration={6000}
      easeLinearity={0.1}
```

(Leaflet 기본값은 `inertiaDeceleration: 3400`, `easeLinearity: 0.2` — 감속을 더 강하게, 관성 구간을 더 짧게 줄이는 방향. 이 변경은 실기기에서 여전히 떨림이 남을 때만 적용하고, 적용 후 다시 Step 2로 돌아가 확인한다.)

적용했다면 커밋:
```bash
git add src/features/map/components/map-canvas.tsx
git commit -m "fix: 드래그 관성 파라미터 조정으로 정지 후 떨림 완화"
```

- [ ] **Step 4: 완료 보고 기준**

Step 2(및 필요 시 Step 3)에서 실제 터치/이동으로 개선을 확인하기 전까지는 이 작업을 "완료"로 보고하지 않는다.
