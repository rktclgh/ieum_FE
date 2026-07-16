# 프로필 이미지 업로드 실패 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로필 이미지 S3 업로드가 실패했을 때 기존 사진을 유지하면서 사용자에게 재시도 가능한 오류를 보여 준다.

**Architecture:** `EditProfileForm`만 로컬 오류 상태를 소유한다. 공통 upload helper와 React Query profile mutation은 변경하지 않아 성공 시 캐시 갱신 및 실패 시 캐시 보존이 기존대로 작동한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node built-in test runner, TypeScript AST static contract tests, pnpm.

## Global Constraints

- 기존 `messages.profileImage.uploadFailed` 번역 키를 사용하고 새 키를 만들지 않는다.
- 업로드 실패 시 `['me']` 캐시와 현재 프로필 이미지 URL을 변경하지 않는다.
- 모임 생성의 기존 `t.imageUploadFailed` 처리와 early return을 유지한다.
- 프로필 삭제 오류와 이미지 편집 모달 UX는 변경하지 않는다.
- 테스트를 먼저 작성하고 수정 전 실패를 확인한다.

---

### Task 1: 프로필 업로드 실패를 보이는 상태로 전환

**Files:**
- Modify: `scripts/ci/test-static-source-contracts.mjs`
- Modify: `src/features/my/components/edit-profile-content.tsx`
- Create: `docs/superpowers/specs/2026-07-16-profile-image-upload-failure-design.md`
- Create: `docs/superpowers/plans/2026-07-16-profile-image-upload-failure.md`

**Interfaces:**
- Consumes: `useProfileImageUpload().upload(blob)` rejection and `messages.profileImage.uploadFailed`.
- Produces: a local visible error with `role="alert"`, cleared before each new image selection/crop attempt.

- [ ] **Step 1: Write the failing static source contract**

Add this test near the other source contracts in `scripts/ci/test-static-source-contracts.mjs`:

```js
test("profile upload failure is visible and does not change the meeting failure contract", () => {
  const profile = read("src/features/my/components/edit-profile-content.tsx")

  assert.match(
    profile,
    /const \[profileImageUploadError, setProfileImageUploadError\] = React\.useState<string \| null>\(null\)/,
  )
  assert.match(
    profile,
    /const handleFileSelected = \(file: File\) => \{\s*setProfileImageUploadError\(null\)/,
  )
  assert.match(
    profile,
    /const handleCropped = async \(blob: Blob\) => \{\s*setProfileImageUploadError\(null\)[\s\S]*?catch \{\s*setProfileImageUploadError\(messages\.profileImage\.uploadFailed\)/,
  )
  assert.match(
    profile,
    /profileImageUploadError && \(\s*<Explanation\s+variant="error"\s+role="alert"\s+text=\{profileImageUploadError\}/,
  )

  const meetup = read("src/features/meetup/components/create-meetup-screen.tsx")
  assert.match(meetup, /catch \{\s*setError\(t\.imageUploadFailed\)\s*return/)
})
```

- [ ] **Step 2: Run the contract test to verify it fails before the UI change**

Run:

```bash
node --test scripts/ci/test-static-source-contracts.mjs
```

Expected: FAIL because `EditProfileForm` has neither `profileImageUploadError` state nor an alert explanation.

- [ ] **Step 3: Add the minimal local error state and alert**

In `EditProfileForm`, add the state adjacent to `editorSrc`:

```tsx
const [profileImageUploadError, setProfileImageUploadError] = React.useState<string | null>(null)
```

At the start of both callbacks, clear stale failure state; replace the empty upload catch with the existing localized message:

```tsx
const handleFileSelected = (file: File) => {
  setProfileImageUploadError(null)
  if (editorSrc) URL.revokeObjectURL(editorSrc)
  setEditorSrc(URL.createObjectURL(file))
}

const handleCropped = async (blob: Blob) => {
  setProfileImageUploadError(null)
  try {
    await upload(blob)
  } catch {
    setProfileImageUploadError(messages.profileImage.uploadFailed)
  }
}
```

Render the alert directly under the avatar/delete controls inside the existing centered wrapper:

```tsx
{profileImageUploadError && (
  <Explanation
    variant="error"
    role="alert"
    text={profileImageUploadError}
    className="mt-2"
  />
)}
```

Keep `useProfileImageUpload`, `upload-image.ts`, `ProfileImageEditor`, and the meeting component unchanged.

- [ ] **Step 4: Run contract, lint, and type checks**

Run:

```bash
pnpm test:contracts
pnpm lint
pnpm typecheck
```

Expected: PASS. The contract proves profile failure visibility/retry reset and preserves the meeting failure guard; lint and typecheck validate the TSX change.

- [ ] **Step 5: Commit the scoped change**

```bash
git add docs/superpowers/specs/2026-07-16-profile-image-upload-failure-design.md docs/superpowers/plans/2026-07-16-profile-image-upload-failure.md scripts/ci/test-static-source-contracts.mjs src/features/my/components/edit-profile-content.tsx
git commit -m "fix: show profile image upload errors"
```
