# #192 Place Picker Geolocation Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make question and meetup location pickers begin at the available current GPS position without an interim Seoul fallback or automatic map flight.

**Architecture:** Reuse the location already held by `HomeMapScreen` when an overlay originates there. For independent entries, keep the picker-local watcher but only treat permission denial as a terminal initial failure; transient geolocation errors remain in the loading gate until a later success arrives.

**Tech Stack:** Next.js App Router, React, TypeScript, Node built-in test runner via `tsx`, existing CI source-contract scripts.

## Global Constraints

- Do not change `MapCanvas` initial/recenter semantics.
- Do not add a dependency or a global provider.
- Preserve manual GPS button recenter behavior.
- Both create flows must share the same picker behavior.
- A browser GPS success must be the first `MapCanvas` center; do not solve the issue with a late automatic `flyToBounds`.

---

### Task 1: Lock transient-error policy with a failing unit test

**Files:**
- Create: `scripts/ci/test-geolocation-initial-status.ts`
- Create: `src/features/map/lib/geolocation-initial-status.ts`

- [x] **Step 1: Write the failing test**

```ts
test("권한 거부만 최초 GPS fallback으로 확정한다", () => {
  assert.equal(isInitialGeolocationFailure(1), true)
  assert.equal(isInitialGeolocationFailure(2), false)
  assert.equal(isInitialGeolocationFailure(3), false)
})
```

- [x] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsx --test scripts/ci/test-geolocation-initial-status.ts`

Expected: FAIL because the classifier module does not exist.

- [x] **Step 3: Implement the smallest classifier**

```ts
const GEOLOCATION_PERMISSION_DENIED = 1

function isInitialGeolocationFailure(errorCode: number) {
  return errorCode === GEOLOCATION_PERMISSION_DENIED
}
```

- [x] **Step 4: Re-run the focused test**

Run: `pnpm exec tsx --test scripts/ci/test-geolocation-initial-status.ts`

Expected: PASS.

### Task 2: Apply the policy to the shared watcher

**Files:**
- Modify: `src/features/map/hooks/use-geolocation.ts`
- Modify: `scripts/ci/test-map-source-contracts.mjs`

- [x] **Step 1: Extend the source contract first**

Require the hook to pass `error.code` through `isInitialGeolocationFailure`, and require `initialStatus` to remain `loading` for transient errors.

- [x] **Step 2: Verify the contract fails against the current unconditional error lock**

Run: `pnpm exec tsx --test scripts/ci/test-map-source-contracts.mjs`

Expected: FAIL because every error currently sets `initialStatus` to `error`.

- [x] **Step 3: Implement minimal watcher changes**

Add an `enabled` option to stop creating a second watch when a home position is supplied. In the error callback, retain `status="error"` but only set `initialStatus="error"` when the classifier returns true.

- [x] **Step 4: Re-run focused tests**

Run: `pnpm exec tsx --test scripts/ci/test-geolocation-initial-status.ts scripts/ci/test-map-source-contracts.mjs`

Expected: PASS.

### Task 3: Thread the home GPS position through both creation flows

**Files:**
- Modify: `src/features/map/components/home-map-screen.tsx`
- Modify: `src/features/meetup/components/create-meetup-screen.tsx`
- Modify: `src/features/question/components/create-question-screen.tsx`
- Modify: `src/features/meetup/components/meetup-location-picker.tsx`
- Modify: `scripts/ci/test-map-source-contracts.mjs`

- [x] **Step 1: Extend source contracts first**

Require both HomeMapScreen overlay call sites to pass `currentPosition={position}`, both create screens to forward it, and picker to choose `currentPosition ?? watchedPosition` while disabling its local watch when a current position exists.

- [x] **Step 2: Verify the contract fails**

Run: `pnpm exec tsx --test scripts/ci/test-map-source-contracts.mjs`

Expected: FAIL because no current-position prop exists yet.

- [x] **Step 3: Implement prop threading and picker selection**

Make `currentPosition` optional for standalone question edit routes. Derive the picker initial status as success whenever either source has a position, otherwise retain the local watcher initial status.

- [x] **Step 4: Re-run map contract bundle**

Run: `bash scripts/ci/test-map-contracts.sh`

Expected: PASS.

### Task 4: Browser and full verification

**Files:** None unless a test exposes an implementation defect.

- [x] **Step 1: Run type and contract validation**

Run: `pnpm typecheck && pnpm test:contracts`

Expected: no #192 regressions. Record any pre-existing baseline failure separately.

- [x] **Step 2: Browser smoke test both flows**

Use Playwright with a fixed non-Seoul geolocation. Open both create overlays and their location pickers. Confirm the first rendered map is centered at the fixed coordinate and no automatic map-recenter action occurs.

- [x] **Step 3: Run the repository verification suite**

Run: `pnpm verify`

Expected: PASS, or isolate and document an unchanged base-branch failure with its exact command output.

- [ ] **Step 4: Commit and publish**

Commit the implementation and tests, push `fix/#192-place-picker-gps`, and open a PR that closes #192.
