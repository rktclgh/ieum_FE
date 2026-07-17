# Profile Image Save Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `/my/edit` save confirmation after a successful profile-image upload or deletion without sending an empty profile PATCH.

**Architecture:** Keep the existing immediate image API workflow. Add a form-session boolean set only after image upload/delete success; compose it with the existing text-field payload dirty state. On submit, photo-only confirmation returns to the previous screen, while text changes retain the existing `updateMe(payload)` mutation.

**Tech Stack:** Next.js 16, React 19, TanStack Query, TypeScript, Node test runner, pnpm.

## Global Constraints

- Do not defer profile image upload or change the image API/S3/backend contract.
- Do not send `updateMe({})` for a photo-only confirmation.
- Preserve upload failure behavior and existing text-profile save behavior.
- Keep the implementation limited to the edit form and its existing static source-contract suite.

---

### Task 1: Add a failing source-contract regression

**Files:**
- Modify: `scripts/ci/test-static-source-contracts.mjs`

**Consumes:** The existing `read()` and Node `assert` helpers.

**Produces:** A test that proves image-success state participates in save eligibility and avoids an empty PATCH.

- [ ] **Step 1: Add the regression test next to the existing profile upload failure test**

```js
test("profile image success enables confirmation without an empty profile patch", () => {
  const profile = read("src/features/my/components/edit-profile-content.tsx")

  assert.match(profile, /const \[hasProfileImageChange, setHasProfileImageChange\] = React\.useState\(false\)/)
  assert.match(profile, /await upload\(blob\)\s*setHasProfileImageChange\(true\)/)
  assert.match(profile, /await remove\(\)\s*setHasProfileImageChange\(true\)/)
  assert.match(profile, /const hasTextChanges = Object\.keys\(payload\)\.length > 0/)
  assert.match(profile, /const hasChanges = hasTextChanges \|\| hasProfileImageChange/)
  assert.match(profile, /if \(!hasTextChanges\) \{\s*router\.back\(\)\s*return\s*\}/)
  assert.match(profile, /updateMe\.mutate\(payload, \{ onSuccess: \(\) => router\.back\(\) \}\)/)
})
```

- [ ] **Step 2: Verify red**

```bash
node --test scripts/ci/test-static-source-contracts.mjs
```

Expected: the new test fails because the form only derives `hasChanges` from `payload`.

### Task 2: Track successful image changes in the edit form

**Files:**
- Modify: `src/features/my/components/edit-profile-content.tsx`

**Consumes:** Successful `upload(blob)` and `remove()` mutation promises plus the current text `payload`.

**Produces:** A save button that is enabled after image success and a submit path with no empty PATCH.

- [ ] **Step 1: Add local confirmation state**

```ts
const [hasProfileImageChange, setHasProfileImageChange] = React.useState(false)
```

- [ ] **Step 2: Mark only successful image operations**

```ts
await upload(blob)
setHasProfileImageChange(true)
```

and:

```ts
await remove()
setHasProfileImageChange(true)
```

Keep both existing `catch` blocks and do not set the flag inside them.

- [ ] **Step 3: Split text and image dirty state**

```ts
const hasTextChanges = Object.keys(payload).length > 0
const hasChanges = hasTextChanges || hasProfileImageChange
```

- [ ] **Step 4: Avoid a profile-only empty PATCH**

At the start of `handleSubmit`, after `if (!canSave) return`, add:

```ts
if (!hasTextChanges) {
  router.back()
  return
}
```

Keep the existing `updateMe.mutate(payload, { onSuccess: () => router.back() })` for text changes.

- [ ] **Step 5: Verify green**

```bash
node --test scripts/ci/test-static-source-contracts.mjs
pnpm test:contracts
```

Expected: both exit 0, including the new profile image contract.

### Task 3: Verify and publish

**Files:**
- Modify: `docs/superpowers/specs/2026-07-17-profile-image-save-button-design.md`
- Modify: `docs/superpowers/plans/2026-07-17-profile-image-save-button.md`
- Modify: `scripts/ci/test-static-source-contracts.mjs`
- Modify: `src/features/my/components/edit-profile-content.tsx`

**Produces:** A Ready `develop` PR closing `rktclgh/ieum_FE#200`.

- [ ] **Step 1: Run type and build verification**

```bash
pnpm typecheck
pnpm exec next build --webpack
git diff --check
```

- [ ] **Step 2: Commit scoped files, push, and open a non-draft PR**

Use branch `200-fix-profile-image-save-button`; include `Closes #200`, the immediate-image-save root cause, no-empty-PATCH behavior, and validation output.

## Plan Self-Review

- Task 1 locks the reported regression before production code changes.
- Task 2 preserves the established immediate image contract and isolates the only new local state.
- Task 3 verifies the full frontend surface and publishes only #200 files.
