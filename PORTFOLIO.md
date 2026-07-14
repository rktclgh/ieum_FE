# 이음(Ieum) — 위치 기반 외국인 커뮤니티 플랫폼

> 프론트엔드 포트폴리오 정리 문서
> 현재 아키텍처 기준: FE #82 정적 export 전환
> 최종 정리: 2026-07-14

이 문서는 현재 FE 구조와 별도 배포 작업의 경계를 구분한다. FE는 검증된 `out/` 산출물을 제공하며, Spring 정적 호스팅과 JAR 검증은 별도 BE 작업이다.

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트 | 이음(Ieum) — 신한 해커톤 출품작 |
| 한 줄 소개 | 한국 거주 외국인이 지도에서 주변 모임과 질문을 찾고, 실시간 채팅으로 교류하는 커뮤니티 서비스 |
| 개발 기간 | 2026.06.22 ~ 2026.07.12 |
| 역할 | 프론트엔드 설계·구현·API 연동 담당 |
| 현재 배포 계약 | Next.js build-only static export, Spring 호스팅은 별도 인계 |

### 핵심 기능

- Leaflet 지도 기반 모임·질문 탐색, 위치 이동, 장소 검색·지오코딩
- 모임 생성·상세·참여·관리와 질문 작성·답변·채택
- STOMP/WebSocket 채팅, 공지, 일정, 메시지 신고
- 이메일·Google·Kakao 인증과 refresh lifecycle
- 친구 요청·검색·목록
- 한국어·영어·일본어·중국어·베트남어·태국어·러시아어 7개 언어

## 2. 기술 스택

| 구분 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 App Router, React 19 |
| 언어 | TypeScript 5 |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand persist |
| HTTP | Axios, cookie/CSRF/refresh interceptor |
| 실시간 | STOMP over WebSocket |
| 지도 | Leaflet, react-leaflet, CARTO tile |
| UI | Tailwind CSS v4, shadcn/ui, Base UI |
| 국제화 | Zustand language state + 7개 message catalog |
| 빌드 | pnpm, Next static export |

## 3. 현재 아키텍처

### 3-1. 도메인 경계

```text
src/
├── app/                 고정 route shell
├── features/<domain>/   api · hooks · lib · components · constants
├── components/ui/       공용 UI와 route state
└── lib/                 API client · query · i18n · navigation · runtime
```

- API DTO는 adapter에서 view model로 변환해 UI 전파를 줄였다.
- React Query는 server state, Zustand는 언어처럼 브라우저에 유지할 client state를 맡는다.
- 내부 이동은 중앙 route builder로 모아 path/query 인코딩을 통일했다.

### 3-2. Next.js는 빌드 도구

```text
[Next build] -> [out/ 정적 파일] -> [별도 Spring static hosting]
                                      ├─ /api/**
                                      └─ /ws
```

- 운영 Node 프로세스가 없다. Next.js는 `output: "export"`로 HTML·asset·client navigation payload를 만든다.
- `trailingSlash: true`로 route별 `index.html`을 만들고, 이미지는 optimizer 없이 제공한다.
- 런타임 ID는 여섯 고정 query page로 이동했다.

| 화면 | Canonical URL |
|---|---|
| 채팅방 | `/chats/room/?chatId=...` |
| 공지 | `/chats/notices/?chatId=...` |
| 신고 | `/chats/report/?chatId=...&messageId=...&target=...` |
| 일정 | `/chats/schedule/?chatId=...` |
| 모임 상세 | `/meetups/detail/?meetingId=...` |
| 질문 상세 | `/questions/detail/?questionId=...` |

ID는 canonical positive integer 문자열과 JavaScript safe integer를 모두 만족해야 한다. invalid query는 data component를 mount하지 않아 API·WebSocket 요청을 막는다.

### 3-3. 클라이언트 인증 경계

`useMe()`가 인증 상태의 단일 진실 공급원이다.

- `/my/**`: protected client gate
- `/login/`, `/join/`: 해당 페이지에만 guest-only gate
- `/join/social/`: 기존 `sessionStorage` 검증 유지
- pending: 확인 UI
- guest 확정: protected route에서 `/login/`으로 이동
- network/5xx: redirect 없이 retry UI

Axios refresh는 진행 중 요청 하나를 공유하고 원 요청을 한 번만 재시도한다. refresh 401/403만 session-expired로 처리해 private cache를 비운다. network/5xx는 identity와 cache를 보존하므로 일시적인 서버 장애가 로그아웃으로 바뀌지 않는다.

### 3-4. production same-origin transport

- REST는 상대 `/api/...`를 호출한다.
- WebSocket은 `window.location.origin`의 `/ws`를 `ws://` 또는 `wss://`로 변환한다.
- local `next dev`만 명시적인 개발 backend origin을 허용한다.
- 브라우저에 외부 지도 API 비밀키를 넣지 않는다. `/api/places/*`는 Spring이 외부 제공자를 호출하는 계약이다.
- Kakao 지도·장소 API 전환과 Kakao OAuth는 별개다. OAuth 로그인과 unslashed `/oauth/kakao/callback`은 유지한다.

### 3-5. FE와 Spring의 책임 분리

FE가 증명하는 것은 exact commit의 `out/` 구조와 브라우저 코드 계약이다. 별도 Spring 작업은 다음을 구현·검증해야 한다.

- exact FE SHA의 `out/.`을 `app-main/src/main/resources/static/`에 복사
- API/admin/actuator 뒤의 static GET·HEAD 허용
- static 요청의 JWT/Redis 검증 생략
- trailing slash와 RSC `.txt` 요청 처리
- browser HTML 404와 API JSON 오류 분리
- `.txt` no-cache, hashed asset immutable cache, HTML-only COOP
- API/WebSocket/SSE의 static 처리 제외

이 항목이 별도 PR과 JAR smoke에서 통과하기 전에는 단일 JAR 배포 완료로 표현하지 않는다.

## 4. 주요 문제 해결

### 4-1. 동시 refresh 경쟁

여러 API가 동시에 401을 받으면 refresh 요청도 중복될 수 있었다. 모듈 단위 `refreshPromise`를 공유해 진행 중인 refresh에 합류시키고, 각 원 요청에는 retry marker를 남겨 한 번만 재시도한다.

여기에 실패 원인을 분리했다. 401/403은 세션 만료, network/5xx는 backend 장애로 처리한다. 이 구분 덕분에 장애 상황에서도 기존 사용자 identity를 보존한다.

### 4-2. 런타임 ID와 정적 export 충돌

채팅·모임·질문 ID는 빌드 시 알 수 없다. runtime ID를 path segment에 두는 대신 유한한 고정 page와 query로 옮겼다. 중앙 parser가 strict positive safe integer만 허용하고, 잘못된 링크는 data component보다 앞에서 차단한다.

### 4-3. REST와 WebSocket의 배포 오리진 불일치

과거에는 Next 설정 프록시와 별도 WebSocket endpoint가 섞여 환경마다 쿠키·연결 조건이 달랐다. 현재 production은 REST와 WebSocket 모두 브라우저 same-origin을 사용한다. 개발 환경만 backend origin을 명시해 로컬 분리를 지원한다.

### 4-4. 서버 상태 갱신 범위

채팅 뮤테이션 뒤 전체 query를 비우지 않고 목록·해당 방·메시지처럼 영향받는 key만 갱신한다. 로그아웃·세션 만료처럼 사용자 경계가 바뀌는 경우에만 private cache 전체를 정리한다.

### 4-5. 지도 검색 UX

검색어는 debounce 후 요청하고 빈 문자열은 차단한다. 독립적인 주소·POI 조회는 병렬로 실행하며, 같은 좌표의 결과는 query cache를 재사용한다. 지도는 먼저 반응하고 세부 주소는 loading state 뒤에 채운다.

## 5. 보존한 역사적 맥락

다음은 이전 설계의 배경이며 현재 구조로 읽으면 안 된다.

- 초기에는 Next Proxy의 cookie 존재 확인과 server component의 사용자 검증을 조합했다. 정적 export 전환 후에는 `useMe()` client gate가 이를 대체한다.
- 초기에는 Next 설정 프록시로 production REST를 연결했다. 현재 production은 Spring과 browser same-origin이다.
- 초기에는 runtime ID dynamic segment를 사용했다. 현재는 여섯 fixed query route다.
- 이전 문서의 refresh·검색 호출 횟수는 로컬 재현 스크립트 기록이며 운영 트래픽 지표나 SLA가 아니다.
- 이전 build 시간·route 수·파일 수·LOC는 당시 snapshot이다. 현재 성과 수치로 재사용하지 않는다.
- Spring static hosting/JAR smoke는 별도 BE 작업이며 이 FE 문서에서 구현·검증 완료를 주장하지 않는다.

## 6. 이력서용 요약

### 한 줄 소개

> Next.js 16·React 19·TypeScript로 한국 거주 외국인을 위한 지도 기반 커뮤니티 프론트엔드를 설계·구현했습니다.

### 핵심 bullet

- Next.js를 build-only static export로 전환하고 runtime ID를 fixed query route와 strict parser로 수렴
- `useMe()` 중심 client auth gate와 refresh failure 분류로 세션 만료와 backend 장애를 분리
- production REST·WebSocket을 browser same-origin으로 통일하고 local development origin만 명시적으로 허용
- TanStack Query key를 도메인별로 설계해 뮤테이션 영향 범위와 private cache lifecycle을 관리
- STOMP/WebSocket 채팅, Leaflet 지도, 모임·질문·친구·신고 흐름 구현
- 외국인 사용자를 위한 7개 언어 message catalog 운영

### 자기소개서용

> 이음의 프론트엔드를 맡으며 기능 추가보다 경계 설계에 집중했습니다. 인증에서는 동시 refresh를 하나의 Promise로 수렴하고, 세션 만료와 서버 장애를 분리해 일시적인 장애가 로그아웃으로 번지지 않게 했습니다. 배포 구조는 Next 서버 의존을 없애고 검증된 정적 산출물과 Spring 책임을 분리했습니다. 이 경험을 통해 화면, 데이터, 인증, 배포가 만나는 지점을 명시적인 계약과 검증으로 관리하는 법을 배웠습니다.
