# #170 장소 선택 지도 초기 GPS viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 새 모임·질문 장소 선택의 첫 지도 viewport를 GPS 좌표로 고정하고, GPS 성공 경로의 자동 flyToBounds를 제거한다.

**Architecture:** useGeolocation이 첫 terminal 결과를 immutable initialStatus로 기록하고, picker가 이를 position과 함께 전달한다. 순수 resolver가 지도 마운트 여부와 최초 center를 결정한다. map은 resolver가 null이면 skeleton만 렌더하고, GPS first mount에서는 recenter nonce를 증가시키지 않는다. 첫 error fallback은 명시적 GPS 버튼 전까지 late GPS를 입력 대상으로 쓰지 않는다.

**Tech Stack:** Next.js 16, React 19, TypeScript, react-leaflet, Node built-in test, Playwright CLI.

## Global Constraints

- 패키지 매니저는 pnpm만 사용하며 새 의존성을 추가하지 않는다.
- 정상 GPS 경로에서 MapCanvas는 GPS 좌표로 최초 마운트하며 자동 recenterKey 증가와 자동 flyToBounds를 금지한다.
- loading 상태는 browser geolocation error까지 MapLoadingSkeleton만 렌더한다. MAP_LOCATION_WAIT_MS 3.5초 타이머를 도입하지 않는다.
- fallback은 첫 terminal initialStatus가 error인 경우, 명시적 GPS recenter 전까지 DEFAULT_MAP_CENTER를 사용한다.
- fallback 뒤 늦은 GPS 수신은 자동으로 viewport를 이동시키지 않는다.
- fallback 뒤 늦은 GPS 수신은 사용자가 GPS 버튼을 누르기 전까지 직접입력 target으로도 쓰지 않는다. 지도 클릭 좌표는 항상 우선한다.
- 위치 버튼을 누르는 명시적 recenter의 기존 inset 기반 동작은 보존한다.
- UI 문자열은 i18n message를 통해 제공한다.
- 커밋 메시지는 한국어 기존 컨벤션을 따르고 Co-Authored-By trailer를 넣지 않는다.

---

### Task 1: 최초 center resolver와 Node 계약 테스트를 TDD로 추가

**Files:**

- Create: src/features/map/lib/initial-map-center.ts
- Create: scripts/ci/test-initial-map-center.ts
- Create: scripts/ci/test-map-contracts.sh
- Modify: scripts/ci/test-client-contracts.sh

**Interfaces:**

- Produces:

~~~ts
interface InitialMapCoordinates {
  lat: number
  lng: number
}

type InitialMapStatus = "loading" | "success" | "error"

function resolveInitialMapCenter(input: {
  position: InitialMapCoordinates | null
  status: InitialMapStatus
  fallbackCenter: InitialMapCoordinates
}): InitialMapCoordinates | null
~~~

- Consumes: structural Coordinates and GeolocationStatus values from the meetup map without importing browser or Leaflet modules.

- [ ] **Step 1: production module이 없는 상태에서 failing test를 작성한다**

Create scripts/ci/test-initial-map-center.ts:

~~~ts
import assert from "node:assert/strict"
import test from "node:test"

import { resolveInitialMapCenter } from "../../src/features/map/lib/initial-map-center"

const GPS = { lat: 35.1796, lng: 129.0756 }
const FALLBACK = { lat: 37.5665, lng: 126.978 }

test("GPS 조회 중에는 MapCanvas initial center를 만들지 않는다", () => {
  assert.equal(
    resolveInitialMapCenter({
      position: null,
      status: "loading",
      fallbackCenter: FALLBACK,
    }),
    null
  )
})

test("GPS 성공이면 최초 center로 GPS 좌표를 반환한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: GPS,
      status: "success",
      fallbackCenter: FALLBACK,
    }),
    GPS
  )
})

test("geolocation error와 좌표 없음에서만 fallback center를 반환한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: null,
      status: "error",
      fallbackCenter: FALLBACK,
    }),
    FALLBACK
  )
})

test("error가 뒤따라도 이미 확보한 GPS 좌표를 우선한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: GPS,
      status: "error",
      fallbackCenter: FALLBACK,
    }),
    GPS
  )
})
~~~

- [ ] **Step 2: test가 아직 실패하는지 확인한다**

Run:

~~~bash
bash scripts/ci/test-map-contracts.sh
~~~

Expected: Cannot find module '../../src/features/map/lib/initial-map-center' 또는 동등한 TypeScript module resolution 실패.

- [ ] **Step 3: 순수 resolver와 compile/run script를 작성한다**

Create src/features/map/lib/initial-map-center.ts:

~~~ts
interface InitialMapCoordinates {
  lat: number
  lng: number
}

type InitialMapStatus = "loading" | "success" | "error"

interface InitialMapCenterInput {
  position: InitialMapCoordinates | null
  status: InitialMapStatus
  fallbackCenter: InitialMapCoordinates
}

function resolveInitialMapCenter({
  position,
  status,
  fallbackCenter,
}: InitialMapCenterInput): InitialMapCoordinates | null {
  if (position) return position
  return status === "error" ? fallbackCenter : null
}

export { resolveInitialMapCenter }
export type { InitialMapCoordinates, InitialMapStatus }
~~~

Create scripts/ci/test-map-contracts.sh:

~~~bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d /tmp/ieum-map-contracts.XXXXXX)"
trap 'rm -rf "$tmp_dir"' EXIT

pnpm exec tsc \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --strict \
  --skipLibCheck \
  --esModuleInterop \
  --rootDir . \
  --outDir "$tmp_dir" \
  scripts/ci/test-initial-map-center.ts

node --test "$tmp_dir/scripts/ci/test-initial-map-center.js"
~~~

Append this command after the existing admin contracts command in scripts/ci/test-client-contracts.sh:

~~~bash
bash scripts/ci/test-map-contracts.sh
~~~

- [ ] **Step 4: resolver tests를 GREEN으로 만든다**

Run:

~~~bash
bash scripts/ci/test-map-contracts.sh
~~~

Expected: all four Node tests pass.

- [ ] **Step 5: commit한다**

~~~bash
git add src/features/map/lib/initial-map-center.ts scripts/ci/test-initial-map-center.ts scripts/ci/test-map-contracts.sh scripts/ci/test-client-contracts.sh
git commit -m "test: #170 장소 선택 초기 지도 중심 계약 추가"
~~~

### Task 2: 장소 선택 GPS gate와 fallback UX를 구현

**Files:**

- Modify: src/features/meetup/components/meetup-location-picker.tsx
- Modify: src/features/meetup/components/meetup-location-map.tsx
- Modify: src/features/map/hooks/use-geolocation.ts
- Modify: src/features/meetup/components/location-list-item.tsx
- Modify: src/lib/i18n/messages/ko.ts
- Modify: src/lib/i18n/messages/en.ts
- Modify: src/lib/i18n/messages/ja.ts
- Modify: src/lib/i18n/messages/zh.ts
- Modify: src/lib/i18n/messages/vi.ts
- Modify: src/lib/i18n/messages/th.ts
- Modify: src/lib/i18n/messages/ru.ts
- Create: scripts/ci/test-map-source-contracts.mjs
- Modify: scripts/ci/test-map-contracts.sh

**Interfaces:**

- Consumes: resolveInitialMapCenter({ position, status, fallbackCenter }) from Task 1.
- Produces: immutable useGeolocation.initialStatus and MeetupLocationMapProps.initialStatus; only the user-triggered GPS button invokes recenterTo(position) and unlocks late GPS.

> **Late-success fallback amendment:** useGeolocation은 watchPosition callback 안에서 initialStatus를 loading → 첫 success/error로 한 번만 전이시킨다. picker는 status 대신 initialStatus를 map에 전달한다. map은 `initialStatus === "error" && !hasExplicitRecenter`일 때 position을 resolver와 직접입력 target에서 제외한다. 지도 클릭 좌표는 별도 clicked state가 우선하므로 fallback 중에도 계속 선택할 수 있다. 이 보강은 render 중 ref mutation과 effect의 동기 setState 없이 늦은 GPS success가 서울 fallback과 다른 보이지 않는 좌표를 자동 선택하는 문제를 막는다.

- [ ] **Step 1: component source contract를 먼저 작성한다**

Create scripts/ci/test-map-source-contracts.mjs:

~~~js
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8")

test("장소 선택 picker가 geolocation status를 map step에 전달한다", () => {
  const source = read("src/features/meetup/components/meetup-location-picker.tsx")
  assert.match(source, /const \{ position, status \} = useGeolocation\(\)/)
  assert.match(source, /<MeetupLocationMap[\s\S]*status=\{status\}/)
})

test("장소 선택 map은 GPS 초기 center resolver를 쓰고 자동 recenter를 만들지 않는다", () => {
  const source = read("src/features/meetup/components/meetup-location-map.tsx")
  const handleGpsStart = source.indexOf("const handleGps = () =>")
  const handleGpsEnd = source.indexOf("\n\n  const { data: reverseGeocoded", handleGpsStart)
  const handleGps = source.slice(handleGpsStart, handleGpsEnd)

  assert.match(source, /const initialMapCenter = resolveInitialMapCenter\(/)
  assert.match(source, /\{initialMapCenter \? \(/)
  assert.match(source, /center=\{recenterTarget \?\? initialMapCenter\}/)
  assert.doesNotMatch(source, /hasCenteredRef/)
  assert.equal((source.match(/recenterTo\(position\)/g) ?? []).length, 1)
  assert.match(handleGps, /if \(position\) recenterTo\(position\)/)
})
~~~

- [ ] **Step 2: source contract가 현재 구현에서 실패하는지 확인한다**

Run:

~~~bash
node --test scripts/ci/test-map-source-contracts.mjs
~~~

Expected: picker가 status를 전달하지 않고 map이 resolver를 사용하지 않아 FAIL.

- [ ] **Step 3: picker와 map을 최소 변경한다**

In meetup-location-picker.tsx, read status together with position and add status={status} to MeetupLocationMap.

In meetup-location-map.tsx:

1. Import MapLoadingSkeleton, DEFAULT_MAP_CENTER, resolveInitialMapCenter, and GeolocationStatus.
2. Add status: GeolocationStatus to props and destructure it.
3. Delete the hasCenteredRef effect that calls recenterTo(position).
4. Add:

~~~ts
const initialMapCenter = resolveInitialMapCenter({
  position,
  status,
  fallbackCenter: DEFAULT_MAP_CENTER,
})
const isLocationFallback = status === "error" && !position
const locationSubtitle =
  currentAddress ?? (isLocationFallback ? t.locationUnavailable : t.loadingAddress)
~~~

5. Replace the unconditional map with:

~~~tsx
{initialMapCenter ? (
  <MapCanvas
    center={recenterTarget ?? initialMapCenter}
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
) : (
  <MapLoadingSkeleton />
)}
~~~

6. Feed locationSubtitle to the direct-input LocationListItem and disable its action while !currentAddress || !target.

In location-list-item.tsx, add optional disabled?: boolean; pass it to the button, add aria-disabled={disabled || undefined}, and add disabled:cursor-not-allowed disabled:opacity-40 to the common class list. Existing callers remain enabled by default.

- [ ] **Step 4: fallback 안내 i18n 키를 추가한다**

Add locationUnavailable: string to the selectLocation type in ko.ts, then add this key to every locale:

| Locale | Value |
| --- | --- |
| ko | 현재 위치를 찾지 못해 서울 시청 주변을 표시합니다. |
| en | Couldn't find your location. Showing the area around Seoul City Hall. |
| ja | 現在地を取得できないため、ソウル市庁周辺を表示しています。 |
| zh | 无法获取当前位置，正在显示首尔市厅附近。 |
| vi | Không thể xác định vị trí hiện tại. Đang hiển thị khu vực quanh Tòa thị chính Seoul. |
| th | ไม่สามารถระบุตำแหน่งปัจจุบันได้ จึงแสดงบริเวณศาลาว่าการกรุงโซล |
| ru | Не удалось определить ваше местоположение. Показана область вокруг мэрии Сеула. |

- [ ] **Step 5: source contract를 CI script에 연결하고 GREEN으로 만든다**

Append to scripts/ci/test-map-contracts.sh:

~~~bash
node --test scripts/ci/test-map-source-contracts.mjs
~~~

Run:

~~~bash
bash scripts/ci/test-map-contracts.sh
pnpm lint
pnpm typecheck
~~~

Expected: map Node tests, source contracts, lint, and typecheck all pass.

- [ ] **Step 6: commit한다**

~~~bash
git add src/features/meetup/components/meetup-location-picker.tsx src/features/meetup/components/meetup-location-map.tsx src/features/meetup/components/location-list-item.tsx src/lib/i18n/messages scripts/ci/test-map-source-contracts.mjs scripts/ci/test-map-contracts.sh
git commit -m "fix: #170 장소 선택 지도를 GPS 초기 위치에서 시작"
~~~

### Task 3: 실제 브라우저·정적 배포 검증과 PR 준비

**Files:**

- Modify: memory.md (ignored local work log only)

**Interfaces:**

- Consumes: Task 1 and Task 2 contracts.
- Produces: recorded verification evidence, clean branch, and issue-closing pull request.

- [ ] **Step 1: local dev server를 실행한다**

Run:

~~~bash
pnpm dev
~~~

Expected: local Next server becomes reachable.

- [ ] **Step 2: Playwright GPS success smoke를 실행한다**

Start a fresh browser context with a Seoul-outside fixed coordinate, grant geolocation, then navigate through 새 모임 작성 → 장소 선택. Before the GPS callback, assert no Leaflet container exists; after it resolves, assert the first rendered map is centered on the fixed coordinate and no automatic move event follows. Save screenshot and trace under ignored output/playwright/.

- [ ] **Step 3: Playwright fallback smoke를 실행한다**

Run the same entry flow with geolocation denied. Confirm the map appears only after the geolocation error path, uses fallback copy, and selecting a clicked map point remains available after reverse geocoding.

- [ ] **Step 4: full verification을 실행한다**

Run:

~~~bash
pnpm test:contracts
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:out
~~~

Expected: every command exits 0.

- [ ] **Step 5: final diff를 검토하고 commit/push/PR을 만든다**

Run:

~~~bash
git diff origin/develop...HEAD --check
git status --short
git push -u origin fix/#170-map-initial-gps
~~~

Create a non-draft PR targeting develop, include Closes #170, the no-automatic-flyToBounds behavior, Node contract evidence, Playwright result, and all verification commands.
