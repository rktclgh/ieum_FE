# Next Static Export Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 서버 런타임 기능을 제거하고 Spring이 배포할 수 있는 유한한 `out/` 정적 산출물을 만든다.

**Architecture:** 런타임 ID는 고정 path의 query로 옮기고 browser가 검증한다. 인증은 `useMe()`와 Axios refresh lifecycle로 이동하며 production REST/WS는 browser same-origin을 사용한다. Spring 호스팅 구현은 별도 BE 호환 PR의 책임이다.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript 5.9, TanStack Query 5, Axios 1.18, Node test runner, Bash.

## Global Constraints

- 대상은 FE issue 82 브랜치이며 모든 작업 커밋은 `#82`를 사용한다.
- 운영 프로세스는 Spring/JVM 하나이고 FE는 `out/`만 제공한다.
- production API와 WebSocket은 same-origin이다.
- runtime ID를 `generateStaticParams()`로 열거하지 않는다.
- 새 dependency를 추가하지 않는다.
- 디자인, API payload, `/questions` 탭은 바꾸지 않는다. `/join/**` guest-only와 trailing-slash Kakao callback은 원본 migration 계약을 따른다.
- 72번 CI/CD workflow와 BE 저장소 파일은 수정하지 않는다.
- 병렬 worker는 지정된 worktree와 write scope만 수정하고 `pnpm build`를 실행하지 않는다.

---

### Task 1: Contract Tests

**Files:**
- Create: `scripts/ci/test-route-builders.ts`
- Create: `scripts/ci/test-auth-state.ts`
- Create: `scripts/ci/test-session-events.ts`
- Create: `scripts/ci/test-session-retry.ts`
- Create: `scripts/ci/test-transport.ts`
- Create: `scripts/ci/test-route-contracts.sh`
- Create: `scripts/ci/test-session-contracts.sh`
- Create: `scripts/ci/test-transport-contracts.sh`
- Create: `scripts/ci/test-client-contracts.sh`

**Interfaces:**
- Produces: exact route strings, positive-safe-integer parsing and builder rejection, auth state resolution, session-expired subscription, refresh failure classification, WS URL conversion.

- [ ] Write route tests for all six query URLs, fixed URLs, URL encoding, invalid parser inputs, and `RangeError` from every numeric builder for zero, negative, decimal, non-finite, and unsafe values.
- [ ] Run `bash scripts/ci/test-route-contracts.sh`; expect TS2307 because `src/lib/navigation/routes.ts` does not exist.
- [ ] Write session tests for pending/user/null/error, expired listener unsubscribe, 401/403 vs 5xx/network, and retry-once marker.
- [ ] Run `bash scripts/ci/test-session-contracts.sh`; expect TS2307 for the three session lib modules.
- [ ] Write transport tests asserting `http://host→ws://host/ws`, `https://host→wss://host/ws`, and normalized dev origin.
- [ ] Run `bash scripts/ci/test-transport-contracts.sh`; expect TS2307 for runtime transport modules.
- [ ] Keep the RED tests uncommitted until each corresponding implementation lands.

### Task 2: Route Core and Fixed Query Pages

**Files:**
- Create: `src/lib/navigation/routes.ts`
- Create: `src/components/ui/route-page-state.tsx`
- Create: `src/app/chats/{room,notices,report,schedule}/page.tsx`
- Create: `src/app/meetups/detail/page.tsx`
- Create: `src/app/questions/detail/page.tsx`
- Delete: `src/app/chats/[chatId]/**/page.tsx`
- Delete: `src/app/meetups/[meetingId]/page.tsx`
- Delete: `src/app/questions/[questionId]/page.tsx`
- Modify: `src/lib/i18n/messages/{ko,en,ja,vi,ru,th,zh}.ts`

**Interfaces:**
- Produces: `parsePositiveInteger(value): number | null`, fail-fast positive-safe-integer guards, and `routes` builders.
- Consumes: existing content components without changing their props.

- [ ] Implement the minimal route helper until `bash scripts/ci/test-route-contracts.sh` passes.
- [ ] Implement one `RoutePageState` API with `kind: "loading" | "invalid-link"`; session UI is not its responsibility.
- [ ] Put each `useSearchParams()` reader inside `Suspense`; invalid IDs return state UI before mounting content.
- [ ] Remove all runtime dynamic app directories.
- [ ] Run `find src/app -type d -name '[[]*[]]' -print`; expect no output.
- [ ] Run route contracts; expect all TAP tests passing.
- [ ] Commit `refactor: #82 동적 상세 경로를 정적 쿼리 경로로 전환`.

### Task 3: Auth Pure Core

**Files:**
- Create: `src/features/session/lib/auth-state.ts`
- Create: `src/features/session/lib/session-events.ts`
- Create: `src/features/session/lib/session-retry.ts`

**Interfaces:**
- Produces: `resolveAuthState`, `notifySessionExpired`, `subscribeSessionExpired`, `classifyRefreshFailure`, `claimRefreshRetry`.

- [ ] Implement only the pure contracts required by Task 1.
- [ ] Give cached user precedence over background errors; only no-user network/5xx is `backend-down`.
- [ ] Run `bash scripts/ci/test-session-contracts.sh`; expect all TAP tests passing.
- [ ] Commit `test: #82 브라우저 세션 전이 계약 고정`.

### Task 4: Runtime, Font, and Lint Baseline

**Files:**
- Create: `src/lib/runtime/dev-backend-origin.ts`
- Create: `.env.local.example`
- Modify: `.gitignore`
- Modify: `src/lib/api/client.ts` only for dev `baseURL`
- Modify: `src/lib/api/file-url.ts` comment
- Modify: `src/features/chat/lib/chat-socket.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Modify: five current lint-error files

**Interfaces:**
- Produces: dev-only HTTP origin and pure `toWebSocketUrl(origin)`.

- [ ] Add `!.env.local.example` after `.env*` and document only public/local keys.
- [ ] Make production API base undefined and production WS derive from browser origin.
- [ ] Remove Geist Mono and use the local Pretendard plus system monospace fallback.
- [ ] Refactor the five `set-state-in-effect` failures without suppressions and preserve watchPosition/recenter behavior.
- [ ] Run transport contracts, `pnpm lint`, and `pnpm exec next typegen && pnpm exec tsc --noEmit --incremental false`.
- [ ] Commit `fix: #82 정적 런타임과 lint 기준선 정리`.

### Task 5: Navigation Convergence

**Files:**
- Modify: runtime-ID call sites in chat list/room, friends, meetup detail, schedule, and question detail.
- Modify: fixed route call sites in login/join/my/social/session alarm.
- Preserve: `src/features/navigation/constants/tab-items.ts` question item.

**Interfaces:**
- Consumes: Task 2 `routes` only; external OAuth URLs and `/api/**` strings stay external/API.

- [ ] Replace every runtime dynamic URL with its builder.
- [ ] Convert fixed internal links to trailing-slash builders, including canonical `/oauth/kakao/callback/`; require the Kakao console and Spring allowlist to use the same URI before deployment.
- [ ] Fix friend fallback arrays as module constants while touching that file.
- [ ] Run route contracts and `rg -n '/chats/\$\{|/meetups/\$\{|/questions/\$\{' src`; expect no navigation hits.
- [ ] Commit `refactor: #82 내부 이동 URL 계약 통합`.

### Task 6: Client Auth Integration

**Files:**
- Create: `src/features/session/hooks/use-auth-state.ts`
- Create: `src/features/session/components/auth-gate.tsx`
- Create: `src/features/session/components/session-route-state.tsx`
- Create: `src/app/my/layout.tsx`
- Create: `src/app/join/layout.tsx`
- Modify: three `src/app/my/**/page.tsx`
- Modify: `src/app/login/page.tsx`, `src/app/join/page.tsx`
- Modify: session API/hooks, `src/lib/api/client.ts`, `src/lib/query/query-provider.tsx`
- Modify: my content/settings, login/social mutations and flows.

**Interfaces:**
- Consumes: Task 2 routes and Task 3 auth/session helpers.
- Produces: protected `/my/**`, guest gates for `/login` and `/join/**`, cache reset on expiry/logout, me invalidation after all login variants.

- [ ] Keep `/login` guest-only and wrap `/join/**` in a shared guest-only layout so `/join/social/` cannot bypass the policy.
- [ ] Replace three my server pages with static shells under protected layout.
- [ ] Publish expiry once from the single refresh promise on refresh 401/403; do nothing to identity cache on network/5xx.
- [ ] On expiry/logout invalidate the session generation, cancel/clear private queries, refetch active public queries, clear disabled observed public queries, remove unobserved public queries, then set `["me"]` to null.
- [ ] Invalidate `["me"]` after password login, existing social login, and social signup.
- [ ] Remove MyPageContent's response-error redirect and stale server-hydration comments.
- [ ] Run session contracts, lint, and typecheck.
- [ ] Commit `feat: #82 클라이언트 인증 경계와 세션 수명주기 전환`.

### Task 7: Export Activation and Verification

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`
- Create: `scripts/ci/verify-static-export.sh`
- Delete: `src/proxy.ts`
- Delete: `src/features/session/api/session-server-api.ts`
- Delete: `src/lib/api/config.ts`

**Interfaces:**
- Produces: `pnpm typecheck`, `test:contracts`, `verify:out`, `verify` and finite `out/` artifact contract.

- [ ] Set only `output: "export"`, `trailingSlash: true`, and `images.unoptimized: true` as deployment config.
- [ ] Remove `next start` and add `typecheck = next typegen && tsc --noEmit --incremental false`.
- [ ] Verify source has no Proxy, runtime dynamic directory, `next/headers`, `next/server`, server API/config, `API_BASE_URL`, config headers/rewrites/redirects, or `next start`.
- [ ] Verify root/404/manifest/favicon/PWA icons, every implemented page HTML and non-empty route payload, `_next/static`, and local WOFF2.
- [ ] Run a fresh `pnpm build` only in the integration worktree, then `pnpm verify:out`.
- [ ] Commit `build: #82 Next 정적 export 활성화`.

### Task 8: Documentation, Final Review, and PR

**Files:**
- Modify: `docs/ROUTES.md`, `docs/map-implementation.md`, `docs/be-map-handoff.md`
- Delete: `docs/static-deploy-plan.md`
- Preserve: 72 CI/CD worktree files and BE repository.

- [ ] Delete the stale static deploy plan and replace its references with the implemented route, auth, artifact, and BE handoff contracts.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm verify`, `git diff --check`, and confirm only `.ai/` remains unrelated/untracked.
- [ ] Review the full branch diff against this plan; fix all Critical/Important findings and rerun covering tests.
- [ ] Push the existing issue 82 branch and create a draft PR to `develop` with `close #82`, changed files, checks, and explicit BE compatibility follow-up.

## Parallel Execution

- Wave 1: Task 2 route core, Task 3 auth pure core, Task 4 runtime/lint in three isolated worktrees.
- Wave 2: Task 5 navigation and Task 6 auth integration in isolated worktrees based on the integrated Wave 1 commit.
- Leader-only: Task 7 export/build, Task 8 docs/full verification/PR.
- No worker runs `pnpm build`; `.next/` and `out/` are leader-owned shared outputs.
