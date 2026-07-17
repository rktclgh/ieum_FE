# 운영자 콘솔 KPI 시계열 및 가시성 개선 설계

## 상태

- 결정일: 2026-07-17
- 결정: 사용자 승인 B안
- 작업 브랜치: `feat/admin-console-kpi`
- 대상: 관리자 전용 `/admin/` 첫 화면. 공개 루트(`/`) 랜딩은 범위 밖이다.

## 목표

운영자가 숫자 카드만 비교하지 않고, 기간별 추세와 즉시 처리할 운영 큐를 한 화면에서 판단하게 한다. 기존 `/admin/**`의 권한·정적 export·데스크톱 전용 경계는 유지하며, KPI 그래프를 위해 필요한 일별 통계 API를 추가한다.

## 범위

### 포함

- `/admin/`을 운영 워크벤치 형태의 대시보드로 재구성한다.
- 7일·30일·90일 기간 전환과 임의의 유효한 날짜 범위를 지원한다.
- 가입/활성 사용자, 질문/사람 답변/채택 답변, 신고 처리 추세를 일별 그래프로 보여 준다.
- 현재 스냅샷인 신고·문의 처리 큐를 우선순위 카드로 보여 준다.
- 사이드바 정보 구조와 기존 회원·신고·문의 목록의 상태 표현을 정리한다.
- 새 `GET /api/v1/admin/stats/overview` 계약을 추가한다.
- 새 chart 라이브러리 없이 접근 가능한 SVG 차트를 만든다.

### 제외

- 공개 `/` 화면의 KPI 노출
- KG 후보 수나 KG 메뉴. 이는 `feat/kg-promotion-approval`이 병합된 뒤 별도 후속으로 연결한다.
- 외부 BI 도구, 드래그/줌 차트, 실시간 스트리밍 통계
- 기존 세 `GET /api/v1/admin/stats/{users,content,reports}` 계약의 삭제·변경

## 선택한 접근

프론트에서 서로 성격이 다른 총계를 막대 높이로 비교하지 않는다. 그 방식은 추세를 제공하지 않고 비율·개수의 단위도 섞는다. 대신 백엔드가 한국 시간 기준 일별 bucket과 현재 처리 큐를 하나의 read-only overview로 반환하고, 프론트는 동일 단위의 series만 선·막대 차트로 표현한다.

## API 계약

### 요청

`GET /api/v1/admin/stats/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&bucket=day`

- 관리자 인증이 필요하다.
- `from`/`to`를 생략하면 기존 통계와 동일하게 오늘을 끝으로 한 최근 30일을 사용한다.
- 범위는 포함 기준 1일 이상 366일 이하이며, `from > to`는 거부한다.
- 현재 지원하는 bucket은 `day`뿐이다. 생략 시 `day`를 사용한다.
- 모든 날짜 경계는 `Asia/Seoul`의 자정이다.

### 성공 응답

```ts
type AdminStatsOverviewResponse = {
  from: string
  to: string
  bucket: "day"
  summary: {
    signupCount: number
    activeUserCount: number
    suspensionCount: number
    questionCount: number
    humanAnswerCount: number
    acceptedHumanAnswerCount: number
    acceptedRate: number
    reportCount: number
    aiReviewedCount: number
    confirmedCount: number
    dismissedCount: number
    sanctionCount: number
  }
  series: Array<{
    date: string
    signupCount: number
    activeUserCount: number
    questionCount: number
    humanAnswerCount: number
    acceptedHumanAnswerCount: number
    reportCount: number
    aiReviewedCount: number
    confirmedCount: number
    dismissedCount: number
    sanctionCount: number
  }>
  queues: {
    pendingReportCount: number
    retryReportCount: number
    deadReportCount: number
    pendingInquiryCount: number
  }
}
```

`acceptedRate`는 `acceptedHumanAnswerCount / humanAnswerCount`이며, 사람이 쓴 답변이 0개면 `0`이다. 일별 채택률은 프론트에서 각 row의 두 count로 계산한다. 일별 퍼센트의 평균을 전체 채택률로 사용하지 않는다.

`activeUserCount`는 그 날짜에 로그인한 서로 다른 사용자 수다. `queue`는 선택 기간의 누적값이 아니라 요청 시점의 처리 대기 상태다.

### 실패 응답

- `400 INVALID_STATS_RANGE`: 형식 오류, 역전된 범위, 366일 초과
- `400 INVALID_STATS_BUCKET`: `day` 이외의 bucket
- `401`: 로그인 필요
- `403`: 관리자 권한 없음

## 백엔드 설계

- `app-main`의 `admin/stats` 기능이 overview controller, DTO, service, repository를 소유한다.
- 기존 통계 endpoint는 호환성을 위해 남긴다. 대시보드는 overview 단일 query로 전환한다.
- repository는 `generate_series` 또는 동등한 date spine으로 요청 기간의 모든 KST 날짜를 만들고, 각 통계 테이블을 날짜별로 집계해 0값 날짜도 반환한다.
- 날짜별 집계에는 해당 이벤트의 실제 시각을 사용한다. 예를 들어 AI 검토는 `ai_reviewed_at`, 신고 확정/기각은 `resolved_at`, 제재는 `user_sanctions.created_at`을 기준으로 한다.
- queue query는 기간 필터 없이 현재 `reports`와 `inquiries` 상태만 읽는다. `pending`, `retry`, `dead`의 의미를 기존 enum과 정확히 맞춘다.
- 모든 query는 read-only transaction에서 실행하고, 목록별 N+1 query를 만들지 않는다.

## 프론트 정보 구조와 상태 경계

`AdminShell`은 기능을 다음 그룹으로 정리한다.

- 운영: 대시보드, 회원
- 심사: 신고, 문의

KG 메뉴는 이 브랜치에 넣지 않는다. KG 후보 기능이 실제 API와 함께 병합되는 브랜치에서만 `지식` 그룹을 추가한다.

대시보드는 다음 순서다.

1. 기간 선택과 마지막 집계 범위
2. 즉시 처리 큐: 신고 대기, AI 재시도, AI dead, 문의 대기
3. 핵심 요약 카드: 사용자·콘텐츠·신고 지표
4. 사용자 추세 선 차트
5. 질문/사람 답변/채택 답변 막대 차트와 채택률 선
6. 신고 처리 선 또는 grouped-bar 차트

회원·신고·문의 목록은 status badge와 색만으로 의미를 전달하지 않는다. 상태 텍스트, 대비, 빠른 필터, focus 상태를 같이 제공한다.

### 비동기 상태

- overview query는 하나의 TanStack Query가 소유한다.
- 최초 로딩은 차트·queue·요약 영역별 skeleton으로 표시한다. 화면 전체를 spinner로 바꾸지 않는다.
- 이미 표시된 데이터가 있는 refetch 실패는 기존 데이터를 유지하고 해당 영역에 retry를 표시한다.
- 기간 내 데이터가 없으면 차트마다 "기간 내 데이터 없음"을 표시한다. API 오류와 빈 결과를 혼동하지 않는다.
- 400 range 오류는 기간 control 인접에 표시하고 이전 성공 데이터를 대체하지 않는다.

### 접근성

- SVG는 각 차트의 제목, 단위, 최고·최저·마지막 값을 포함한 `aria-label`을 가진다.
- 동일 series를 읽을 수 있는 screen-reader 전용 표를 제공한다.
- 색은 보조 수단이며 series 이름·패턴·범례를 함께 제공한다.
- 1024px 미만의 기존 admin desktop boundary는 유지한다.

## 구현 경계

### 프론트

- `src/features/admin/dashboard/api/admin-stats-api.ts`: overview DTO와 API client
- `src/features/admin/dashboard/hooks/use-admin-stats-overview.ts`: 기간/overview query 경계
- `src/features/admin/dashboard/components/*`: date range, queue cards, summary cards, SVG chart
- `src/features/admin/shared/components/admin-shell.tsx`: navigation IA
- `src/features/admin/shared/components/*`: 실제로 여러 목록이 공유하는 status badge만 추가
- 관리자 i18n messages와 route documentation을 동기화

### 백엔드

- `app-main/.../admin/stats/controller`: `/overview` endpoint
- `app-main/.../admin/stats/dto`: overview request/response
- `app-main/.../admin/stats/service`: KST 범위 검증과 summary/series 조합
- `app-main/.../admin/stats/repository`: date spine과 queue aggregation
- `code/api/API-SPEC.md` 및 `docs/admin-dashboard-api-contract.md`: 구현 후 AS-BUILT 계약 동기화

## 검증

- backend: KST 날짜 경계, 0값 날짜 채움, 366일 범위, 채택률 분자/분모, queue 상태별 count를 테스트한다.
- frontend: range serialization, overview query key, loading/error/empty, chart의 접근성 요약, API wiring을 테스트한다.
- lint, typecheck, build, static export 검증을 수행한다.
- 실제 관리자 계정으로 7/30/90일 전환, 1280px 화면, 1023px desktop boundary, 401/403/range error를 smoke test한다.

## 후속 연결

KG 승격 기능이 병합된 뒤에만 overview `queues`에 `pendingKnowledgeCandidateCount`를 additive하게 추가하고 대시보드에 지식 후보 queue card를 연결한다. 이 브랜치는 그 테이블이나 API를 선행 가정하지 않는다.
