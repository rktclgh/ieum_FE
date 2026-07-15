# Admin Dashboard Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 Next.js 정적 export 앱 안에 canonical `me.role`로 보호되는 데스크톱 운영자 대시보드와 회원·신고·문의 운영 화면을 구현한다.

**Architecture:** `/admin/**`는 고정 App Router page와 query 기반 detail route로 만들고 `AdminGate → AdminDesktopBoundary → AdminShell` 경계 안에서만 `/api/v1/admin/**` feature query를 mount한다. `AdminGate`의 canonical `/api/v1/users/me` session query는 화면 폭과 무관하게 실행될 수 있지만, 1024px 미만에서는 dashboard child가 mount되지 않아 관리자 feature API는 호출되지 않는다. 각 feature는 API DTO, TanStack Query hook, page component를 함께 소유하며 기존 same-origin `apiClient`, CSRF, refresh, route helper를 재사용한다. Spring forwarding과 backend 보안·감사 구현은 별도 backend 계획의 책임이다.

**Tech Stack:** Next.js 16.2.9 App Router static export, React 19.2.4, TypeScript 5, TanStack Query 5, Axios 1.18, Tailwind CSS 4, Base UI, Node test runner, pnpm 10.17.

## Global Constraints

- 작업 브랜치는 `feat/admin-dashboard-frontend`, 기준 브랜치는 `develop`이다.
- 새 dependency를 추가하지 않는다.
- 운영 API는 browser same-origin이고 모든 HTTP 호출은 `apiClient`를 사용한다.
- 권한의 canonical source는 `GET /api/v1/users/me`의 `role: "user" | "admin"`이다. login 응답 role과 localStorage는 gate에 사용하지 않는다.
- `/admin/**` API 인가는 Spring Security가 최종 경계이며 client gate는 화면 노출만 제어한다.
- 지원 폭은 `(min-width: 1024px)`이고 미지원 폭에서는 protected child와 `/api/v1/admin/**` query를 mount하지 않는다. Canonical session 판정을 위한 `/api/v1/users/me`는 예외다.
- 런타임 ID route directory를 만들지 않는다. 상세 URL은 `/admin/users/detail/?userId=...`, `/admin/reports/detail/?reportId=...`이다.
- 관리자 입력과 JSON은 React text node 또는 `JSON.stringify`로만 출력하며 `dangerouslySetInnerHTML`을 사용하지 않는다.
- 회원 역할 변경, 회원 영구 삭제, 콘텐츠 삭제, AI 정책·지식 관리, chart, bulk/export는 이 계획에 포함하지 않는다.
- 각 task는 RED → 최소 구현 → GREEN → 관련 회귀 검증 → 한글 커밋 순서로 끝낸다.
- worker는 공유 산출물 `.next/`와 `out/`을 만들지 않는다. `pnpm build`와 `pnpm verify:out`은 Task 8 통합 단계에서 한 번 실행한다.

---

### Task 1: 관리자 pure contract와 test runner

**Files:**
- Create: `scripts/ci/test-admin-contracts.ts`
- Create: `scripts/ci/test-admin-source-contracts.mjs`
- Create: `scripts/ci/test-admin-contracts.sh`
- Modify: `scripts/ci/test-client-contracts.sh`
- Create: `src/features/admin/auth/lib/admin-access.ts`
- Create: `src/features/admin/shared/lib/admin-query.ts`
- Create: `src/features/admin/shared/types/admin-types.ts`
- Create: `src/features/session/types/user-role.ts`

**Interfaces:**
- Produces: neutral session `UserRole`, shared admin enum unions, `CursorPage<T>`, `JsonValue`, `AdminGatePolicy`, `AdminGateDecision`, `resolveAdminGateDecision`, `compactQuery`.
- `compactQuery(values)` omits only `undefined`, `null`, and empty string; it preserves `0` and returns `URLSearchParams`.

- [ ] **Step 1: Create the runner skeleton, then write failing pure contract tests**

Create executable `test-admin-contracts.sh` first. It compiles `test-admin-contracts.ts` into a temporary directory with the same TypeScript flags as `test-route-contracts.sh`, runs `node --test`, then runs `node --test scripts/ci/test-admin-source-contracts.mjs`. Create the source-test file with one passing assertion that `src/app` has no dynamic directory. This makes the first RED run fail on the missing production module, not on a missing runner.

`test-admin-contracts.ts` must assert this exact matrix:

```ts
const protectedCases = [
  [{ kind: "loading" }, "loading"],
  [{ kind: "refreshing" }, "loading"],
  [{ kind: "backend-down", error: new Error("down") }, "backend-down"],
  [{ kind: "guest" }, "redirect-login"],
  [{ kind: "authenticated", user: { role: "user" } }, "forbidden"],
  [{ kind: "authenticated", user: { role: "admin" } }, "allow"],
] as const

const loginCases = [
  [{ kind: "loading" }, "loading"],
  [{ kind: "refreshing" }, "loading"],
  [{ kind: "backend-down", error: new Error("down") }, "backend-down"],
  [{ kind: "guest" }, "allow"],
  [{ kind: "authenticated", user: { role: "user" } }, "forbidden"],
  [{ kind: "authenticated", user: { role: "admin" } }, "redirect-home"],
] as const
```

Also assert:

```ts
assert.equal(compactQuery({ status: "active", q: "kim", cursor: null, size: 20 }).toString(), "status=active&q=kim&size=20")
assert.equal(compactQuery({ status: "", decision: undefined }).toString(), "")
```

- [ ] **Step 2: Run the RED contract**

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL with TS2307 for `src/features/admin/auth/lib/admin-access`.

- [ ] **Step 3: Implement the pure contracts**

Use these exact public types:

```ts
type UserStatus = "active" | "suspended"
type SanctionType = "temporary" | "permanent"
type ReportReason = "spam" | "ad" | "abuse" | "obscene" | "harassment" | "etc"
type ReportStatus = "pending" | "ai_reviewed" | "confirmed" | "dismissed"
type ReportAiReviewState = "pending" | "processing" | "retry" | "completed" | "cancelled" | "dead"
type AdminReportDecision = "suspend" | "hold" | "normal"
interface CursorPage<T> { items: T[]; nextCursor: string | null }
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

type AdminGatePolicy = "protected" | "login"
type AdminGateDecision =
  | "loading"
  | "backend-down"
  | "redirect-login"
  | "redirect-home"
  | "forbidden"
  | "allow"
```

Define `type UserRole = "user" | "admin"` in neutral `src/features/session/types/user-role.ts`; session/login and admin types import it from there. `resolveAdminGateDecision` must implement the tested matrix and accept the existing `AuthState<TUser>` shape structurally. `compactQuery` must use `new URLSearchParams()` and append `String(value)` only for included entries.

- [ ] **Step 4: Wire the completed runner into the existing suite**

Append `bash scripts/ci/test-admin-contracts.sh` to `test-client-contracts.sh` before static export tests and keep temporary output cleanup in a shell trap.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && pnpm test:contracts`

Expected: all existing and new TAP tests PASS.

```bash
git add scripts/ci/test-admin-contracts.ts scripts/ci/test-admin-source-contracts.mjs scripts/ci/test-admin-contracts.sh scripts/ci/test-client-contracts.sh src/features/admin/auth/lib/admin-access.ts src/features/admin/shared/lib/admin-query.ts src/features/admin/shared/types/admin-types.ts src/features/session/types/user-role.ts
git commit -m "관리자 프론트 계약 테스트 기반 추가"
```

### Task 2: role SSOT, 관리자 routes, 메시지 계약

**Files:**
- Modify: `src/features/session/api/session-api.ts`
- Modify: `src/features/login/api/auth-api.ts`
- Modify: `src/lib/navigation/routes.ts`
- Modify: `scripts/ci/test-route-builders.ts`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`
- Create: `src/lib/i18n/messages/admin.ts`
- Modify: `src/lib/i18n/messages/ko.ts`
- Modify: `src/lib/i18n/messages/en.ts`
- Modify: `src/lib/i18n/messages/ja.ts`
- Modify: `src/lib/i18n/messages/zh.ts`
- Modify: `src/lib/i18n/messages/vi.ts`
- Modify: `src/lib/i18n/messages/th.ts`
- Modify: `src/lib/i18n/messages/ru.ts`

**Interfaces:**
- Consumes: Task 1 neutral session `UserRole`.
- Produces: `UserMeResponse.role: UserRole`; typed `LoginResponse.role`; `routes.adminHome`, `adminLogin`, `adminUsers`, `adminUserDetail`, `adminReports`, `adminReportDetail`, `adminInquiries`; `Messages.admin: AdminMessages`.

- [ ] **Step 1: Extend route and source tests first**

Add exact fixed route expectations:

```ts
adminHome: "/admin/"
adminLogin: "/admin/login/"
adminUsers: "/admin/users/"
adminReports: "/admin/reports/"
adminInquiries: "/admin/inquiries/"
```

Add exact detail expectations and invalid-input assertions:

```ts
assert.equal(routes.adminUserDetail(7), "/admin/users/detail/?userId=7")
assert.equal(routes.adminReportDetail(9), "/admin/reports/detail/?reportId=9")
assert.throws(() => routes.adminUserDetail(0), RangeError)
assert.throws(() => routes.adminReportDetail(Number.NaN), RangeError)
```

The source contract must parse `session-api.ts` and assert `UserMeResponse` contains non-optional `role: UserRole`, while `auth-api.ts` imports and uses the same `UserRole` type.

- [ ] **Step 2: Run RED**

Run: `bash scripts/ci/test-route-contracts.sh && bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL because admin route builders and `UserMeResponse.role` are absent.

- [ ] **Step 3: Add canonical role and route builders**

Add `role: UserRole` to `UserMeResponse`, replace `LoginResponse.role: string` with `UserRole`, and add builders through existing `queryRoute`/`requirePositiveInteger`:

```ts
adminUserDetail: (userId: number) =>
  queryRoute("/admin/users/detail/", { userId: requirePositiveInteger(userId, "userId") }),
adminReportDetail: (reportId: number) =>
  queryRoute("/admin/reports/detail/", { reportId: requirePositiveInteger(reportId, "reportId") }),
```

- [ ] **Step 4: Add admin messages without component literals**

Define `AdminMessages` with these nested groups and keys:

```ts
interface AdminMessages {
  common: { loading: string; loadError: string; empty: string; retry: string; loadMore: string; all: string; save: string; cancel: string }
  auth: { title: string; description: string; desktopOnly: string; forbidden: string; switchAccount: string }
  navigation: { dashboard: string; users: string; reports: string; inquiries: string }
  dashboard: { title: string; range: (from: string, to: string) => string; signup: string; activeUsers: string; suspendedUsers: string; pins: string; questions: string; meetings: string; answers: string; acceptedRate: string; messages: string; reports: string; aiReviewed: string; confirmed: string; dismissed: string; sanctions: string }
  users: { title: string; search: string; status: string; email: string; nickname: string; role: string; grade: string; provider: string; lastActiveAt: string; birthDate: string; gender: string; nationality: string; profileImage: string; detail: string; activity: string; questions: string; answers: string; accepted: string; reported: string; reports: string; reporter: string; messageId: string; sanctions: string; sanctionType: string; temporary: string; permanent: string; reason: string; createdAt: string; createdBy: string; endsAt: string; releasedAt: string; releasedBy: string; sanction: string; activate: string; activationConfirm: string; activationScopeNotice: string; invalidReason: string; invalidEndsAt: string }
  reports: { title: string; status: string; aiState: string; decision: string; target: string; reporter: string; reportedUser: string; missingReportedUser: string; reason: string; createdAt: string; detail: string; evidence: string; evidenceHash: string; aiResult: string; recommendation: string; confidence: string; reviewedAt: string; modelVersion: string; policyVersion: string; policySetHash: string; lastErrorCode: string; resolution: string; sanctions: string; confirm: string; dismiss: string; confirmNotice: string; resolvedConflict: string }
  inquiries: { title: string; userEmail: string; missingUser: string; createdAt: string; status: string; content: string; answer: string; answeredBy: string; answeredAt: string; answerPlaceholder: string; answerSubmit: string; invalidAnswer: string; answeredConflict: string }
}
```

`adminKo` supplies Korean copy; `adminEn` supplies English copy. `ko.ts` uses `adminKo`, `en.ts` uses `adminEn`, and `ja/zh/vi/th/ru` deliberately use `adminEn` until operator translations are commissioned.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-route-contracts.sh && bash scripts/ci/test-admin-contracts.sh && pnpm typecheck`

Expected: route/admin contracts and TypeScript PASS.

```bash
git add src/features/session/api/session-api.ts src/features/login/api/auth-api.ts src/lib/navigation/routes.ts scripts/ci/test-route-builders.ts scripts/ci/test-admin-source-contracts.mjs src/lib/i18n/messages
git commit -m "관리자 역할·라우트·메시지 계약 추가"
```

### Task 3: AdminGate, desktop boundary, login, shell

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/features/admin/auth/components/admin-gate.tsx`
- Create: `src/features/admin/auth/components/admin-login-page.tsx`
- Create: `src/features/admin/shared/components/admin-async-state.tsx`
- Create: `src/features/admin/shared/components/admin-desktop-boundary.tsx`
- Create: `src/features/admin/shared/components/admin-shell.tsx`
- Modify: `src/components/ui/confirm-dialog.tsx`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`

**Interfaces:**
- Consumes: `resolveAdminGateDecision`, `useAuthState`, `useLogin`, `useLogoutMutation`, admin routes/messages.
- Produces: `AdminGate({ policy, children })`, `AdminDesktopBoundary({ children })`, `AdminShell({ children })`, `AdminAsyncState`.

- [ ] **Step 1: Add failing source assertions**

Assert all of the following:

- `admin/layout.tsx` exports robots `{ index: false, follow: false }`.
- protected layout nests `<AdminGate policy="protected">`, `<AdminDesktopBoundary>`, then `<AdminShell>`.
- login page nests `<AdminGate policy="login">` and `<AdminDesktopBoundary>` but not `AdminShell`.
- `AdminGate` redirects only with `routes.adminLogin()` and `routes.adminHome()` according to Task 1 decisions.
- `AdminDesktopBoundary` uses `useSyncExternalStore` and returns the unsupported state before returning `children`.
- admin login uses `useLogin`; it does not inspect `LoginResponse.role` and does not write localStorage.
- admin login renders mutation errors and disables its inputs and submit button while pending.
- shared `ConfirmDialog` exposes optional `confirmDisabled?: boolean`, applies the native `disabled` attribute, and remains backward compatible when omitted.

- [ ] **Step 2: Run RED**

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL with missing admin layout/gate files.

- [ ] **Step 3: Implement gate and desktop boundary**

`AdminGate` renders exactly one of these outcomes: loading state, backend retry state, redirect loading state, forbidden state with `LogoutButton`, or children. `AdminDesktopBoundary` subscribes to `window.matchMedia("(min-width: 1024px)")`; `getServerSnapshot` returns `false`, and unsupported mode returns the desktop-only message without mounting children.

- [ ] **Step 4: Implement login and shell**

`AdminLoginPage` has controlled email/password fields, displays mutation errors, disables fields and submit while pending, and calls `useLogin().mutate({ email, password })`. Successful login relies on the active `['me']` invalidation already owned by `useLogin`; `AdminGate policy="login"` moves canonical admins to `/admin/`. Shell sidebar uses exactly four fixed route builders (dashboard, users, reports, inquiries), `aria-current="page"`, and the existing `LogoutButton`; `adminLogin` is gate-only.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && pnpm lint && pnpm typecheck`

Expected: admin source contracts, lint, and typecheck PASS.

```bash
git add src/app/admin src/features/admin/auth/components src/features/admin/shared/components src/components/ui/confirm-dialog.tsx scripts/ci/test-admin-source-contracts.mjs
git commit -m "관리자 인증 경계와 데스크톱 셸 추가"
```

### Task 4: KPI 대시보드

**Files:**
- Create: `src/app/admin/(protected)/page.tsx`
- Create: `src/features/admin/dashboard/api/admin-stats-api.ts`
- Create: `src/features/admin/dashboard/hooks/use-admin-stats.ts`
- Create: `src/features/admin/dashboard/components/admin-dashboard-page.tsx`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`

**Interfaces:**
- Produces: `UserStatsResponse`, `ContentStatsResponse`, `ReportStatsResponse`, `getAdminUserStats`, `getAdminContentStats`, `getAdminReportStats`, `useAdminStats`.
- `useAdminStats()` returns `{ user, content, reports, isPending, isError, refetch }` from three parallel `useQuery` calls keyed under `['admin','stats']`.

- [ ] **Step 1: Add failing endpoint and state assertions**

The source test must find exactly these GET literals in `admin-stats-api.ts`:

```text
/api/v1/admin/stats/users
/api/v1/admin/stats/content
/api/v1/admin/stats/reports
```

It must also assert dashboard page branches for pending, error with `refetch`, and all 14 successful cards (including `messages.admin.dashboard.pins`), verifies accepted-rate percentage conversion, and contains no chart import.

- [ ] **Step 2: Run RED**

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL because stats files do not exist.

- [ ] **Step 3: Implement API and query aggregation**

Use the backend DTO field names unchanged. Do not pass `from`/`to`; the API default range is authoritative. Query keys are `['admin','stats','users']`, `['admin','stats','content']`, and `['admin','stats','reports']`.

- [ ] **Step 4: Implement KPI cards**

Render response `from`/`to`, then cards for all 14 metrics: signup, active user, period-sanctioned user, pin, question, meeting, answer, accepted rate, message, report, AI reviewed, confirmed, dismissed, sanction. Use `Intl.NumberFormat`; render `acceptedRate * 100` with one decimal plus `%`. Label `suspendedUserCount` as the distinct users sanctioned during the selected range, not the current suspended-user total. If any query fails, render one retry state that calls all three `refetch` functions.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && pnpm lint && pnpm typecheck`

Expected: PASS.

```bash
git add src/app/admin/'(protected)'/page.tsx src/features/admin/dashboard scripts/ci/test-admin-source-contracts.mjs
git commit -m "관리자 KPI 대시보드 추가"
```

### Task 5: 회원 목록·상세·제재·활성화

**Files:**
- Create: `src/app/admin/(protected)/users/page.tsx`
- Create: `src/app/admin/(protected)/users/detail/page.tsx`
- Create: `src/features/admin/users/api/admin-users-api.ts`
- Create: `src/features/admin/users/hooks/use-admin-users.ts`
- Create: `src/features/admin/users/lib/admin-sanction.ts`
- Create: `src/features/admin/users/components/admin-users-page.tsx`
- Create: `src/features/admin/users/components/admin-user-detail-page.tsx`
- Modify: `scripts/ci/test-admin-contracts.ts`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`

**Interfaces:**
- Produces: backend-shaped `AdminUserItem`, `AdminUserDetailResponse`, `CreateSanctionRequest`, `CreateSanctionResponse`; user query/mutation hooks; `validateSanctionDraft`.
- `validateSanctionDraft(draft, now)` returns `{ ok: true, value: CreateSanctionRequest }` or `{ ok: false, field: 'reason' | 'endsAt' }`.

Use these response shapes without renaming fields:

```ts
type UserGrade = "bronze" | "silver" | "gold" | "platinum" | "diamond"
type AuthProvider = "email" | "google" | "kakao"
interface AdminUserItem { userId: number; email: string; nickname: string; role: UserRole; status: UserStatus; grade: UserGrade; provider: AuthProvider; lastActiveAt: string | null }
interface AdminUserProfile extends AdminUserItem { birthDate: string | null; gender: "male" | "female" | "other" | null; nationality: string | null; profileImageUrl: string | null }
interface AdminUserActivity { questionCount: number; answerCount: number; acceptedCount: number; reportedCount: number }
interface AdminUserReportItem { reportId: number; reason: ReportReason; status: ReportStatus; reporterId: number; reporterNickname: string | null; messageId: number | null; detail: string | null; createdAt: string }
interface AdminUserSanctionItem { sanctionId: number; type: SanctionType; reason: string; createdAt: string; createdBy: number | null; endsAt: string | null; releasedAt: string | null; releasedBy: number | null }
interface AdminUserDetailResponse { user: AdminUserProfile; activity: AdminUserActivity; reports: AdminUserReportItem[]; sanctions: AdminUserSanctionItem[] }
interface CreateSanctionRequest { type: SanctionType; reason: string; endsAt?: string }
interface CreateSanctionResponse { sanctionId: number }
```

- [ ] **Step 1: Write failing validation tests**

Assert trimmed valid reason, blank reason failure, 501-character failure, temporary missing/past end failure, temporary future ISO success, and permanent success that omits `endsAt`. Source contracts also assert sanction/activation confirmations pass mutation pending state to `ConfirmDialog.confirmDisabled`.

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL with TS2307 for `admin-sanction`.

- [ ] **Step 2: Implement validation and API contracts**

Use exact endpoints:

```text
GET  /api/v1/admin/users?status=&q=&cursor=&size=20
GET  /api/v1/admin/users/{userId}
POST /api/v1/admin/users/{userId}/sanctions
POST /api/v1/admin/users/{userId}/activate
```

Do not add or call `PATCH /role`. Use enum literals `active|suspended`, `user|admin`, `temporary|permanent` and the backend DTO property names from the design spec.

- [ ] **Step 3: Implement list query and table**

`useAdminUsers({ status, q, size: 20 })` uses `useInfiniteQuery`, `initialPageParam: null`, `getNextPageParam: page.nextCursor`. Page state owns raw search, the existing `useDebouncedValue` with 300ms delay, and status. Table rows link with `routes.adminUserDetail(userId)` and render explicit loading/error/empty/load-more branches.

- [ ] **Step 4: Implement guarded detail and mutations**

The detail route reads `userId` in a client child under `React.Suspense`, parses with `parsePositiveInteger`, and returns admin invalid-link state before mounting `AdminUserDetailPage`. The detail page renders profile, four activity metrics, recent reports, sanction history, inline sanction form, and activation confirmation. The activation action and confirmation must use `activationScopeNotice` to state that every unreleased sanction is released, not just one row. Both mutations disable their form and confirmation action while pending. Successful mutations invalidate `['admin','users']` and `['admin','users','detail',userId]`; 409/403 errors remain adjacent to the form.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && bash scripts/ci/test-route-contracts.sh && pnpm lint && pnpm typecheck`

Expected: validation, endpoint, detail guard, route, lint, and type tests PASS.

```bash
git add src/app/admin/'(protected)'/users src/features/admin/users scripts/ci/test-admin-contracts.ts scripts/ci/test-admin-source-contracts.mjs
git commit -m "관리자 회원 조회와 제재 화면 추가"
```

### Task 6: 신고 목록·상세·확정·기각

**Files:**
- Create: `src/app/admin/(protected)/reports/page.tsx`
- Create: `src/app/admin/(protected)/reports/detail/page.tsx`
- Create: `src/features/admin/reports/api/admin-reports-api.ts`
- Create: `src/features/admin/reports/hooks/use-admin-reports.ts`
- Create: `src/features/admin/reports/components/admin-reports-page.tsx`
- Create: `src/features/admin/reports/components/admin-report-detail-page.tsx`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`

**Interfaces:**
- Produces: backend-shaped report list/detail types with `JsonValue` snapshots; list/detail query hooks; `useConfirmAdminReport`, `useDismissAdminReport`.

The report type contract is:

```ts
interface AdminReportUserSummary { userId: number; nickname: string }
interface AdminReportTargetSummary { type: "message" | "answer"; id: number; deleted: boolean }
interface AdminReportAiSummary { reviewState: ReportAiReviewState; recommendation: string | null; decision: AdminReportDecision | null; confidence: number | null; reviewedAt: string | null }
interface AdminReportListItem { reportId: number; target: AdminReportTargetSummary; reporter: AdminReportUserSummary; reportedUser: AdminReportUserSummary | null; reason: ReportReason; status: ReportStatus; ai: AdminReportAiSummary; createdAt: string }
interface AdminReportListResponse { items: AdminReportListItem[]; nextCursor: string | null }
interface AdminReportAiDetail extends AdminReportAiSummary { reason: string | null; modelVersion: string | null; policyVersion: string | null; policySetHash: string | null; result: JsonValue | null; lastErrorCode: string | null }
interface AdminReportResolution { decision: ReportStatus; resolvedBy: AdminReportUserSummary; resolvedAt: string }
interface AdminReportSanctionItem { sanctionId: number; decisionSource: string; type: "temporary" | "permanent"; reason: string; admin: AdminReportUserSummary | null; startsAt: string; endsAt: string | null; releasedAt: string | null; releasedBy: AdminReportUserSummary | null; createdAt: string }
interface AdminReportDetailResponse extends Omit<AdminReportListItem, "ai"> { detail: string | null; contextSnapshot: JsonValue | null; contextHash: string | null; ai: AdminReportAiDetail; resolution: AdminReportResolution | null; sanctions: AdminReportSanctionItem[] }
```

- [ ] **Step 1: Add failing report source contracts**

Assert GET list/detail and POST `/{reportId}/confirm`, `/{reportId}/dismiss`; query filters `status`, `aiReviewState`, `decision`, `cursor`, `size`; detail query guard; `reportedUser` nullable with `missingReportedUser` fallback; `JSON.stringify(contextSnapshot, null, 2)` and `JSON.stringify(ai.result, null, 2)`; no `dangerouslySetInnerHTML` in `src/features/admin`. Assert list loading, error/retry, empty, load-more, and next-page loading branches; detail loading, error/retry, populated/read-only-resolution branches; and mutation-pending disable behavior.

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL because report files do not exist.

- [ ] **Step 2: Implement API and hooks**

Use enum unions from backend: report status `pending|ai_reviewed|confirmed|dismissed`, AI state `pending|processing|retry|completed|cancelled|dead`, decision `suspend|hold|normal`, target `message|answer`. Both decision mutations invalidate the report detail and every report list query in `onSettled` so 204, 409, and network recovery converge on server state.

- [ ] **Step 3: Implement list and detail pages**

List uses three native select filters, a cursor load-more button, and detail links, with explicit loading, error/retry, empty, load-more, and next-page loading states. Detail shows target/reporter/reported user, reason/detail, evidence snapshot/hash, AI metadata/result, resolution, sanctions, and timestamp; a null `reportedUser` renders `messages.admin.reports.missingReportedUser`. Detail has loading, error/retry, populated, and read-only resolution states but no pagination state. Pending or AI-reviewed reports expose confirm/dismiss buttons through `ConfirmDialog`, disabled while either mutation is pending; resolved reports show read-only resolution.

- [ ] **Step 4: Preserve decision semantics**

Place `messages.admin.reports.confirmNotice` beside confirm: confirming a report does not create a new sanction. On `REPORT_ALREADY_RESOLVED` or `REPORT_CONCURRENTLY_CHANGED`, show `resolvedConflict`, refetch, and disable further decisions once the refreshed status is resolved.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && bash scripts/ci/test-route-contracts.sh && pnpm lint && pnpm typecheck`

Expected: PASS.

```bash
git add src/app/admin/'(protected)'/reports src/features/admin/reports scripts/ci/test-admin-source-contracts.mjs
git commit -m "관리자 신고 검수 화면 추가"
```

### Task 7: 문의 목록·답변

**Files:**
- Create: `src/app/admin/(protected)/inquiries/page.tsx`
- Create: `src/features/admin/inquiries/api/admin-inquiries-api.ts`
- Create: `src/features/admin/inquiries/hooks/use-admin-inquiries.ts`
- Create: `src/features/admin/inquiries/lib/admin-inquiry.ts`
- Create: `src/features/admin/inquiries/components/admin-inquiries-page.tsx`
- Modify: `scripts/ci/test-admin-contracts.ts`
- Modify: `scripts/ci/test-admin-source-contracts.mjs`

**Interfaces:**
- Produces: `AdminInquiryItem`, `getAdminInquiries`, `answerAdminInquiry`, inquiry query/mutation hooks, `normalizeInquiryAnswer(value): string | null`.

```ts
interface AdminInquiryItem { inquiryId: number; userId: number; userEmail: string | null; title: string; content: string; status: "pending" | "answered"; answer: string | null; answeredBy: number | null; answeredAt: string | null; createdAt: string }
interface AnswerInquiryRequest { answer: string }
```

- [ ] **Step 1: Write RED inquiry tests**

Assert `normalizeInquiryAnswer("  답변  ") === "답변"`, blank returns `null`, 2000 characters pass, and 2001 characters return `null`. Source contracts assert `userEmail` is nullable and a null fixture renders `messages.admin.inquiries.missingUser`.

Run: `bash scripts/ci/test-admin-contracts.sh`

Expected: FAIL with TS2307 for `admin-inquiry`.

- [ ] **Step 2: Implement API and hooks**

Use exact endpoints and DTO fields:

```text
GET  /api/v1/admin/inquiries?status=&cursor=&size=20
POST /api/v1/admin/inquiries/{inquiryId}/answer  body { answer }
```

Status union is `pending|answered`. Successful or 409 mutation invalidates every `['admin','inquiries']` query.

- [ ] **Step 3: Implement list, expansion, and answer form**

Render status filter, cursor load-more, and rows with user email/title/status/createdAt; null email renders `messages.admin.inquiries.missingUser` for a deleted or absent user row. Selecting a row expands content. Pending rows expose one controlled textarea with `maxLength={2000}`; answered rows expose answer, answeredBy, answeredAt. Submit uses normalized text and disables while invalid or pending.

- [ ] **Step 4: Handle conflict and states**

On `INQUIRY_ALREADY_ANSWERED`, render `answeredConflict`, refetch the list, and replace the form with server answer. Include explicit loading, error/retry, empty, and next-page loading states.

- [ ] **Step 5: Run GREEN and commit**

Run: `bash scripts/ci/test-admin-contracts.sh && pnpm lint && pnpm typecheck`

Expected: PASS.

```bash
git add src/app/admin/'(protected)'/inquiries src/features/admin/inquiries scripts/ci/test-admin-contracts.ts scripts/ci/test-admin-source-contracts.mjs
git commit -m "관리자 문의 답변 화면 추가"
```

### Task 8: route 문서, static export, 통합 검증

**Files:**
- Modify: `docs/ROUTES.md`
- Modify: `scripts/ci/test-static-source-contracts.mjs`
- Modify: `spec.md`
- Modify: `memory.md`
- Modify: `src/features/admin/spec.md`
- Modify: `src/features/admin/memory.md`

**Interfaces:**
- Consumes: Tasks 1–7 complete admin route tree.
- Produces: documented static route inventory and verified `out/admin/**` artifacts. Spring forward/package files remain untouched.

- [ ] **Step 1: Extend static source assertions before docs**

Assert the app tree discovers exactly these new route strings: `admin`, `admin/login`, `admin/users`, `admin/users/detail`, `admin/reports`, `admin/reports/detail`, `admin/inquiries`. Assert no `[userId]`/`[reportId]` directory and that only route builders contain the two detail path literals. Strengthen the admin source contract to parse `AdminDesktopBoundary` and prove the unsupported branch returns before the sole `children` return, while protected layouts place all feature pages inside that boundary.

- [ ] **Step 2: Run RED against incomplete route documentation**

Run: `node --test scripts/ci/test-static-source-contracts.mjs`

Expected: FAIL until `docs/ROUTES.md` contains every canonical admin URL and backend handoff note.

- [ ] **Step 3: Update route and local collaboration documents**

Add an “운영자” table to `docs/ROUTES.md` with all seven URLs, access policy, API groups, query ID rule, desktop-only rule, and the explicit note that Spring `StaticPageController`/JAR package verification changes are owned by the backend worktree. Update root and feature `spec.md`/`memory.md` Index entries and record completed task/test/commit status without duplicating the design document.

- [ ] **Step 4: Run full automated verification**

Run:

```bash
pnpm install --frozen-lockfile
pnpm test:contracts
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:out
git diff --check
```

Expected: every command exits 0; `out/admin/{login,users,users/detail,reports,reports/detail,inquiries}/index.html` and `index.txt`, plus `out/admin/index.html` and `index.txt`, are non-empty.

- [ ] **Step 5: Run manual smoke**

Use disposable smoke accounts/records tagged with a unique run ID and record every created user/report/inquiry/sanction identifier before mutation. At 1280px verify guest → admin login, admin login → dashboard, normal user forbidden/logout, three KPI calls, user search/detail/sanction/activate, report filters/detail/confirm/dismiss, inquiry answer, invalid IDs, 409 refresh, and logout. At 1023px reload each protected route, capture the browser request log, and verify the desktop-only state with zero `/api/v1/admin/**` requests; `/api/v1/users/me` is allowed for canonical gating. Remove disposable records through the test-data cleanup path and record both request evidence and cleanup result in `src/features/admin/memory.md`.

- [ ] **Step 6: Review scope and commit**

Run: `git diff --name-only develop...HEAD` and confirm there are no backend files, dependency manifest changes, role-change UI, chart code, or dynamic route directories.

```bash
git add docs/ROUTES.md scripts/ci/test-static-source-contracts.mjs
git commit -m "관리자 라우트 문서와 정적 배포 검증 보강"
```

## Execution Waves

- Wave 1, sequential foundation: Tasks 1–3.
- Wave 2, after shell integration: Tasks 4, 5, 6, 7 may use separate worktrees or subagents because their feature directories are disjoint. The leader owns shared test/message conflict resolution.
- Wave 3, leader-only: Task 8 fresh build, artifact verification, smoke, scope review.

## Extraction Trigger

The completed feature stays in this Next application. Open a separate design issue only when independent admin deploy/rollback, admin-only CSP/VPN/IP allowlist/auth domain, PWA scope separation, or materially divergent release cadence becomes a confirmed requirement.
