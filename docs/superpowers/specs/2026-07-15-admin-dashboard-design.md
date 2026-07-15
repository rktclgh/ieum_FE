# 운영자 대시보드 프론트엔드 설계

## 목적

현재 모바일 PWA와 같은 Next.js 애플리케이션 안에 데스크톱 전용 `/admin/**` 정적 페이지를 추가한다. 기존 same-origin 인증 쿠키, CSRF 헤더, Axios refresh, TanStack Query를 재사용하되 운영자 UI와 상태는 `src/features/admin` 아래에 격리한다. 공용 `UserRole`만 session 경계에 두어 기존 session/login이 admin feature를 역참조하지 않게 한다.

별도 프론트 애플리케이션은 만들지 않는다. 관리자만 독립 배포해야 하거나 별도 CSP, MFA, VPN/IP allowlist가 필요해질 때 분리를 다시 검토한다.

## 범위

### 이번 프론트 작업

- 기존 `POST /api/v1/auth/login`을 사용하는 `/admin/login/`
- `GET /api/v1/users/me`의 canonical `role`을 기준으로 하는 `AdminGate`
- 1024px 이상에서만 자식과 `/api/v1/admin/**` feature query를 mount하는 데스크톱 경계
- `/admin/` KPI 대시보드
- 회원 목록·검색·상태 필터·상세·제재·활성화
- 신고 목록·필터·상세·확정·기각
- 문의 목록·상태 필터·답변
- 모든 화면의 loading, error/retry, empty 상태
- 고정 정적 경로와 query 기반 상세 URL
- route builder, 관리자 pure contract, 정적 source/export 검증
- `docs/ROUTES.md`와 로컬 `spec.md`/`memory.md` 동기화

### 제외

- 회원 역할 변경 UI
- 회원 영구 삭제, 콘텐츠 삭제, 일괄 처리, CSV export
- AI 정책·지식 관리, AI 제재 검수 queue
- 시계열 차트와 신규 chart dependency
- Spring static forwarding, bootJar 패키징, 백엔드 보안·감사 로그 구현
- 별도 관리자 앱 또는 `admin.*` 서브도메인

## 선행 백엔드 계약

프론트의 role gate는 편의 기능이고 최종 보안 경계는 Spring Security다. 다음 백엔드 작업을 배포 전 선행 조건으로 둔다.

1. `GET /api/v1/users/me` 응답에 `role: "user" | "admin"`을 추가한다.
2. 관리자 요청과 refresh에서 현재 DB role/status 또는 동등한 canonical version을 검증한다.
3. `users.auth_version` 또는 동등한 영속 세션 세대를 사용해 Redis revoke 실패 뒤에도 옛 세션이 access·refresh에서 거부되게 한다.
4. 주요 관리자 mutation은 actor, target, reason, bounded before/after facts를 같은 트랜잭션의 append-only 감사 행으로 기록한다.

프론트는 login 응답의 `role`이나 localStorage를 권한 기준으로 사용하지 않는다. login 성공 뒤 active `['me']` query가 갱신되고 그 응답의 `role`만 사용한다.

## URL 계약

| URL | 화면 | 접근 |
|---|---|---|
| `/admin/login/` | 관리자 계정 로그인 | guest 허용, admin은 `/admin/` 이동, 일반 사용자는 접근 거부 |
| `/admin/` | KPI 대시보드 | admin-only |
| `/admin/users/` | 회원 목록 | admin-only |
| `/admin/users/detail/?userId={id}` | 회원 상세·제재 | admin-only |
| `/admin/reports/` | 신고 목록 | admin-only |
| `/admin/reports/detail/?reportId={id}` | 신고 상세·결정 | admin-only |
| `/admin/inquiries/` | 문의 목록·답변 | admin-only |

Next 정적 export 계약 때문에 런타임 `[userId]`, `[reportId]` 디렉터리를 만들지 않는다. ID는 기존 `parsePositiveInteger`를 사용하며 잘못된 query에서는 detail component와 API query를 mount하지 않는다.

## App Router 구조

```text
src/app/admin/
├── layout.tsx
├── login/page.tsx
└── (protected)/
    ├── layout.tsx
    ├── page.tsx
    ├── users/page.tsx
    ├── users/detail/page.tsx
    ├── reports/page.tsx
    ├── reports/detail/page.tsx
    └── inquiries/page.tsx
```

`admin/(protected)` route group은 URL에 나타나지 않는다. `admin/layout.tsx`는 `noindex, nofollow` metadata만 소유하고, protected layout은 `AdminGate → AdminDesktopBoundary → AdminShell` 순서로 자식을 감싼다. 로그인도 desktop boundary를 적용하지만 protected shell은 사용하지 않는다.

## 프론트 모듈 구조

```text
src/features/admin/
├── auth/
│   ├── components/admin-gate.tsx
│   ├── components/admin-login-page.tsx
│   └── lib/admin-access.ts
├── dashboard/
│   ├── api/admin-stats-api.ts
│   ├── components/admin-dashboard-page.tsx
│   └── hooks/use-admin-stats.ts
├── users/
│   ├── api/admin-users-api.ts
│   ├── components/admin-user-detail-page.tsx
│   ├── components/admin-users-page.tsx
│   ├── hooks/use-admin-users.ts
│   └── lib/admin-sanction.ts
├── reports/
│   ├── api/admin-reports-api.ts
│   ├── components/admin-report-detail-page.tsx
│   ├── components/admin-reports-page.tsx
│   └── hooks/use-admin-reports.ts
├── inquiries/
│   ├── api/admin-inquiries-api.ts
│   ├── components/admin-inquiries-page.tsx
│   ├── hooks/use-admin-inquiries.ts
│   └── lib/admin-inquiry.ts
└── shared/
    ├── components/admin-async-state.tsx
    ├── components/admin-desktop-boundary.tsx
    ├── components/admin-shell.tsx
    ├── lib/admin-query.ts
    └── types/admin-types.ts
```

각 feature API 파일이 backend DTO와 endpoint를 소유한다. 페이지 컴포넌트는 API client를 직접 호출하지 않고 query/mutation hook만 사용한다. 공통 파일은 cursor page, status enum, query serializer와 shell/state처럼 둘 이상의 관리자 feature가 실제로 공유하는 것만 둔다. `UserRole`은 neutral session type이며 admin feature가 이를 소비한다.

## 인증·접근 상태

`AdminGate`는 `useAuthState()` 결과를 다음처럼 결정한다.

| 인증 상태 | protected | login |
|---|---|---|
| loading/refreshing | 확인 화면 | 확인 화면 |
| backend-down | retry 화면 | retry 화면 |
| guest | `/admin/login/` replace | 로그인 폼 |
| authenticated + `role=user` | 접근 거부 + 로그아웃 | 접근 거부 + 로그아웃 |
| authenticated + `role=admin` | 자식 | `/admin/` replace |

일반 사용자를 login으로 다시 보내면 redirect loop가 생기므로 접근 거부 화면에서 기존 세션을 로그아웃하고 다른 계정으로 로그인할 수 있게 한다. 401/403, CSRF, refresh 처리는 기존 `apiClient`를 그대로 사용한다.

## 데스크톱 경계와 화면 골격

- 기준 폭: CSS media query `(min-width: 1024px)`.
- `useSyncExternalStore`와 `matchMedia`로 지원 폭을 구한다.
- 1024px 미만에서는 관리자 자식을 mount하지 않아 `/api/v1/admin/**` 요청을 시작하지 않는다. Gate의 canonical session 판정을 위한 `/api/v1/users/me`는 layout 순서상 실행될 수 있다.
- shell은 고정 240px sidebar, 유동 main, 최대 content 폭 1440px를 사용한다.
- sidebar: 대시보드, 회원, 신고, 문의. 역할 변경 메뉴는 노출하지 않는다.
- 기존 primary/gray 토큰과 Button을 재사용하고 새 dependency를 추가하지 않는다.
- 표는 keyboard focus가 보이는 링크/버튼과 실제 `<table>` header를 사용한다.

## 데이터·API 계약

### 통계

`GET /api/v1/admin/stats/users`, `/content`, `/reports`를 병렬 query로 호출한다. 서버 기본 30일 범위를 사용하고 응답 `from`/`to`를 화면에 표시한다. KPI 카드만 제공하며 그래프를 유추하지 않는다.

`acceptedRate`는 `0..1` 비율이므로 화면에서는 `acceptedRate * 100`을 소수점 한 자리 퍼센트로 표시한다. 현행 `suspendedUserCount`는 현재 정지자 수가 아니라 조회 기간에 제재가 생성된 distinct 회원 수이므로 카드 문구도 “기간 내 제재 회원”으로 쓴다.

### 회원

- 목록 query: `status`, `q`, `cursor`, `size=20`
- 검색은 300ms debounce, 검색어/상태가 바뀌면 새 query key를 사용한다.
- 상세 query: `GET /api/v1/admin/users/{userId}`
- 제재: `POST .../{userId}/sanctions`, `type=temporary|permanent`, trimmed reason 1..500, temporary만 미래 `endsAt` 필수
- 활성화: `POST .../{userId}/activate`. 이 API는 해당 사용자의 모든 미해제 제재를 함께 해제하므로 UI는 “전체 제재 해제 및 계정 활성화”로 표시하고 확인 단계에서 범위를 다시 고지한다.
- mutation 성공 뒤 detail과 모든 users list query를 invalidate한다.
- 역할 변경 endpoint는 호출하지 않는다.

### 신고

- 목록 query: `status`, `aiReviewState`, `decision`, `cursor`, `size=20`
- 상세: `contextSnapshot`과 AI `result`를 `JsonValue`로 취급해 `<pre>{JSON.stringify(...)}</pre>`로만 표시한다.
- AI 답변 신고는 `reportedUser=null`일 수 있으므로 목록·상세에서 명시적인 대상 사용자 없음 fallback을 표시한다.
- `dangerouslySetInnerHTML`을 사용하지 않는다.
- confirm은 신고 상태만 확정하며 새 제재를 만들지 않는다는 문구를 버튼 근처에 표시한다.
- 409 `REPORT_ALREADY_RESOLVED`/`REPORT_CONCURRENTLY_CHANGED`는 detail/list를 refetch하고 최신 상태 안내를 표시한다.

### 문의

- 목록 query: `status`, `cursor`, `size=20`
- 삭제되었거나 누락된 사용자와 left join된 문의는 `userEmail=null`일 수 있으므로 명시적인 사용자 없음 fallback을 표시한다.
- 별도 detail URL 없이 선택 row 아래 내용을 확장한다.
- pending 항목만 답변 폼을 노출하고 trimmed answer 1..2000을 전송한다.
- 409 `INQUIRY_ALREADY_ANSWERED`는 목록을 refetch하고 서버 답변을 표시한다.

모든 cursor 목록은 자동 intersection observer 대신 명시적 “더 보기” 버튼을 사용한다. 중복 fetch를 막고 운영자가 현재 표 위치를 제어하기 쉽다.

## 상태와 오류

- 최초 query: skeleton 대신 일관된 centered loading state
- 빈 목록: 필터 유지 + empty 설명
- query 오류: 페이지를 유지하고 retry button으로 `refetch`
- mutation 오류: form/button 인접 alert, backend `code`에 맞춘 메시지
- mutation 중: 해당 버튼만 disabled, 중복 제출 차단
- invalid detail ID: admin 전용 invalid-link 상태, API 미호출
- 401/refresh 만료: 기존 session reset 뒤 gate가 login으로 이동
- 403: gate만 신뢰하지 않고 “권한이 없습니다” 상태 유지

## 메시지 정책

`src/lib/i18n/messages/admin.ts`에 `AdminMessages`, `adminKo`, `adminEn`을 둔다. 한국어는 `adminKo`, 영어는 `adminEn`, 현재 운영 범위에서 별도 번역이 없는 `ja/zh/vi/th/ru`는 `adminEn`을 사용한다. 기존 모바일 메시지 객체에는 `admin` 필드만 추가해 관리자 copy를 feature 컴포넌트에서 직접 하드코딩하지 않는다.

## 테스트 전략

새 dependency 없이 Node test runner와 기존 static source contract를 사용한다.

1. `scripts/ci/test-admin-contracts.ts`: gate 결정, query 직렬화, route, 제재·문의 form validation pure test
2. `scripts/ci/test-admin-source-contracts.mjs`: role SSOT, protected route group, detail guard, endpoint wiring, no HTML injection, desktop child mount 차단 검증
3. `scripts/ci/test-admin-contracts.sh`: 위 TypeScript test compile/run + source test
4. 기존 `test-route-builders.ts`: 관리자 고정/detail URL과 invalid ID
5. 기존 static route discovery/export: 새 page를 자동 발견하고 `out/admin/**/index.html|index.txt` 검증
6. `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify:out`

최종 수동 smoke는 고유 run ID의 disposable test data를 만들고 식별자를 기록한 뒤 1280px과 1023px, guest/user/admin 접근 matrix, 목록 filter/load-more, valid/invalid detail query, 각 mutation 성공·409·validation 실패를 확인한다. 1023px request log에는 `/api/v1/admin/**`가 없어야 하며 `/api/v1/users/me`는 허용한다. 종료 시 test data를 정리하고 결과를 기록한다.

## 별도 앱 추출 조건

아래 중 하나가 확정되면 현재 feature 경계를 유지한 채 별도 관리자 앱을 설계한다.

- 관리자만 독립 배포·rollback해야 한다.
- 관리자 전용 CSP, VPN/IP allowlist 또는 인증 도메인이 필요하다.
- 소비자 PWA manifest scope에서 `/admin`을 분리해야 한다.
- 운영 화면이 현재 앱의 build 시간·bundle·release cadence를 의미 있게 방해한다.

현재 단계에서는 인증·배포 중복 비용이 더 크므로 같은 앱의 `/admin`을 유지한다.
