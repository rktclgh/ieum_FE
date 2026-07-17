# Map Pin Thumbnail URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make meeting thumbnails inside Leaflet map pins use the same file-URL normalization as the meeting detail and result-card screens.

**Architecture:** Keep the backend's relative file URL contract unchanged. `pin-marker.tsx` resolves a meeting pin's nullable `thumbnailUrl` through the existing `resolveFileUrl` utility before placing it in Leaflet `divIcon` HTML; the existing `escapeAttr` remains the final HTML-attribute boundary. A Node source-contract test locks that connection because the current test environment cannot mount Leaflet without a browser DOM.

**Tech Stack:** Next.js 16, React 19, Leaflet, TypeScript, Node test runner, pnpm.

## Global Constraints

- Reuse `resolveFileUrl`; do not add a backend endpoint, S3 behavior, Next rewrite, or new dependency.
- Keep production relative URL behavior, already-absolute URL behavior, and the no-thumbnail visual fallback unchanged.
- Keep question pins and cluster pins unchanged.
- Escape the resolved URL with the existing `escapeAttr`; do not encode it again.
- The only implementation files are `pin-marker.tsx` and the existing map source-contract test.

---

### Task 1: Lock the map-marker URL boundary with a failing regression test

**Files:**
- Modify: `scripts/ci/test-map-source-contracts.mjs`

**Consumes:** Existing `read()` helper and Node `assert` setup in the map source-contract suite.

**Produces:** A regression test that fails until map-pin thumbnail HTML consumes a `resolveFileUrl(pin.thumbnailUrl)` result instead of the raw API value.

- [ ] **Step 1: Add the failing source-contract test**

Append this test to `scripts/ci/test-map-source-contracts.mjs`:

```js
test("모임 마커 썸네일은 파일 URL을 정규화한다", () => {
  const source = read("src/features/map/components/pin-marker.tsx")

  assert.match(source, /import \{ resolveFileUrl \} from "@\/lib\/api\/file-url"/)
  assert.match(source, /const thumbnailUrl = resolveFileUrl\(pin\.thumbnailUrl\)/)
  assert.match(source, /escapeAttr\(thumbnailUrl\)/)
  assert.doesNotMatch(source, /escapeAttr\(pin\.thumbnailUrl\)/)
})
```

- [ ] **Step 2: Verify the test is red for the observed bug**

Run:

```bash
node --test scripts/ci/test-map-source-contracts.mjs
```

Expected: the new test fails because `pin-marker.tsx` neither imports `resolveFileUrl` nor uses a normalized thumbnail value.

### Task 2: Normalize the marker thumbnail with the existing file URL utility

**Files:**
- Modify: `src/features/map/components/pin-marker.tsx`

**Consumes:** `MapPin.thumbnailUrl: string | null`, `resolveFileUrl`, and `escapeAttr`.

**Produces:** Leaflet marker HTML whose meeting `<img src>` points to the backend origin in local development and retains same-origin behavior in production.

- [ ] **Step 1: Add the existing file URL resolver import**

Place this import with the other aliases:

```ts
import { resolveFileUrl } from "@/lib/api/file-url"
```

- [ ] **Step 2: Resolve once at the marker boundary**

At the beginning of `buildPinIcon`, before `inner` is constructed, add:

```ts
const thumbnailUrl = resolveFileUrl(pin.thumbnailUrl)
```

- [ ] **Step 3: Use only the resolved URL in the meeting image**

Replace the meeting condition and source interpolation with the `thumbnailUrl` condition and `escapeAttr(thumbnailUrl)`. Do not alter the question-pin branch, `escapeAttr`, marker geometry, or click handling.

- [ ] **Step 4: Verify the targeted regression is green**

Run:

```bash
node --test scripts/ci/test-map-source-contracts.mjs
bash scripts/ci/test-map-contracts.sh
```

Expected: both commands exit 0; the second command includes the new source-contract test.

### Task 3: Verify the frontend integration surface and publish

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-map-pin-thumbnail-url-design.md`
- Modify: `docs/superpowers/plans/2026-07-16-map-pin-thumbnail-url.md`
- Modify: `scripts/ci/test-map-source-contracts.mjs`
- Modify: `src/features/map/components/pin-marker.tsx`

**Consumes:** The completed regression test and minimal production change.

**Produces:** A reviewable frontend-only fix PR targeting `develop` and closing `rktclgh/ieum_FE#195`.

- [ ] **Step 1: Run static frontend checks**

```bash
pnpm lint
pnpm typecheck
```

Expected: both commands exit 0 without changing API contracts.

- [ ] **Step 2: Inspect the scoped diff**

```bash
git diff --check origin/develop...HEAD
git status --short
```

Expected: only the design, plan, map source-contract, and marker implementation files are changed.

- [ ] **Step 3: Commit the documented fix**

```bash
git add docs/superpowers/specs/2026-07-16-map-pin-thumbnail-url-design.md docs/superpowers/plans/2026-07-16-map-pin-thumbnail-url.md scripts/ci/test-map-source-contracts.mjs src/features/map/components/pin-marker.tsx
git commit -m "fix: 지도 모임 핀 썸네일 URL 정규화"
```

- [ ] **Step 4: Push and open a Ready PR**

Push `195-fix-map-pin-thumbnail` and create a non-draft PR into `develop` with `Closes #195`, the root cause, changed boundary, and exact verification commands.

## Plan Self-Review

- Spec coverage: Task 1 prevents raw URLs from returning; Task 2 applies the minimal shared resolver; Task 3 verifies and publishes the scoped change.
- Placeholder scan: no unresolved implementation or validation steps remain.
- Type consistency: `thumbnailUrl` remains `string | null`, while `resolveFileUrl` produces `string | undefined` and is checked for truthiness before `escapeAttr` receives a string.
