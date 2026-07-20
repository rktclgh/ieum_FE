# 이음(Ieum) 라우트 계약

> 프론트엔드 URL 구조와 정적 배포 계약을 함께 관리하는 문서다. 라우트를 추가·변경할 때는 이 문서를 같은 PR에서 갱신한다.
>
> - 와이어프레임: [Figma – 신한해커톤 와이어프레임](https://www.figma.com/design/FPRPYHC1ukJph6hjRiyU0Z/?node-id=782-1049)
> - 생성: 2026-07-02
> - 최종 수정: 2026-07-15 (운영자 데스크톱 라우트 7개 + 전체 정적 export 인벤토리 동기화)

## 배포 및 URL 원칙

- Next.js 16은 빌드 도구로만 사용한다. 운영에는 `out/` 정적 파일만 배포한다.
- 내부 이동은 `src/lib/navigation/routes.ts`의 route builder를 기준으로 한다.
- `trailingSlash: true`에 맞춰 고정 페이지 URL은 끝에 `/`를 붙인다.
- 루트 `/`를 제외한 고정 페이지는 trailing slash canonical을 사용한다. Kakao callback도 `/oauth/kakao/callback/`로 통일한다.
- Kakao 지도·장소 API 전환은 Kakao OAuth와 별개다. OAuth 개발자 콘솔과 Spring allowlist에는 trailing-slash callback URI를 동일하게 등록한다.
- 런타임 ID는 동적 path segment가 아니라 고정 path의 query로 전달한다. 빌드 시 ID 목록을 열거하지 않는다.
- ID query와 route builder 입력은 positive safe integer여야 한다. builder는 잘못된 입력에 `RangeError`를 던진다.
- 잘못된 ID에서는 data component를 mount하지 않는다. 해당 화면의 API·WebSocket 요청도 시작하지 않는다.
- `useSearchParams()`는 각 page에서 가장 가까운 `Suspense` 아래 client child에서만 읽는다.
- 필터·정렬·탭·검색어처럼 화면 상태를 나타내는 값도 query로 전달한다.

## 구현된 라우트

### 인증

| Canonical URL | 화면 | 백엔드 API | 접근 계약 |
|---|---|---|---|
| `/login/` | 로그인 (아이디·비밀번호, 소셜, 언어 설정) | `POST /auth/login` | guest-only |
| `/join/` | 회원가입 — 계정 만들기 | `POST /auth/signup` | `/join/**` 공통 guest-only layout |
| `/join/social/` | 소셜 회원가입 — 프로필 설정 | `PATCH /users/me` | guest-only + 기존 `sessionStorage` 검증 |
| `/oauth/kakao/callback/` | Kakao OAuth callback | OAuth code 교환 | public shell, 개발자 콘솔·Spring allowlist와 정확히 일치 |

### 홈 및 모임

| Canonical URL | 화면 | 와이어프레임 | 백엔드 API | 접근 계약 |
|---|---|---|---|---|
| `/` | 지도 홈 | ④ 홈 1) | `GET /meetups?bounds=`, `GET /questions?bounds=` | public shell |
| `/?pin={id}&type=meetup\|question` | 핀 선택 바텀시트 | ④ 홈 2) 3) | 상동 | public shell |
| `/?view=list` | 주변 둘러보기 — 리스트 보기 | ④ 홈 4) | 상동 | public shell |
| `/meetups/detail/?meetingId={meetingId}` | 모임 상세 (참여하기 → 그룹채팅 입장) | ④ 홈 2) | `GET /meetups/{id}`, `POST /meetups/{id}/join` | public shell, 참여 API는 Spring 인증 필요 |

핀 선택과 리스트 전환은 같은 지도 화면의 상태이므로 별도 path가 아닌 query로 처리한다.

### 질문 내역 및 답변

| Canonical URL | 화면 | 와이어프레임 | 백엔드 API | 접근 계약 |
|---|---|---|---|---|
| `/questions/` | 내 질문 내역 (무한 스크롤, 롱프레스 삭제) | ⑦ 질문 내역 1) | `GET /api/v1/questions/me`, `DELETE /api/v1/questions/{id}` | public shell, 조회·삭제 API는 Spring 인증 필요 |
| `/questions/detail/?questionId={questionId}` | 질문 상세·답변 보기 | ⑦ 질문 내역 2) | `GET /questions/{id}`, `POST /questions/{id}/answer`, `POST /answers/{id}/accept`, `POST /chat/rooms/question` (BE #68), `POST /answers/{id}/report` (BE #69) | 상세 shell은 public, 답변·채택·채팅·신고 API는 Spring 인증 필요 |

- 질문 상세는 `useMe()`로 작성자와 답변자 화면을 나눈다.
- 작성자는 답변 채택, 답변자와 1:1 꼬리질문 채팅 시작, 답변 신고를 할 수 있다. 답변자는 답변을 입력할 수 있다.
- 작성자 국기·작성 시각은 BE #64 응답을 기다리며 프론트는 필드를 null-safe하게 처리한다.
- 꼬리질문 채팅 시작과 답변 신고는 BE #68/#69 배포 전까지 계약 우선으로 연결하며, API가 미구현이면 안내 메시지를 표시한다.

### 채팅 및 소셜

| Canonical URL | 화면 | 와이어프레임 | 백엔드 API | 접근 계약 |
|---|---|---|---|---|
| `/chats/` | 채팅 목록 (그룹 + 1:1 꼬리질문) | ⑤ 모임채팅 1) | `GET /chats` | public shell, 데이터 API는 Spring 인증 필요 |
| `/chats/room/?chatId={chatId}` | 채팅방 (그룹채팅·꼬리질문 채팅 공용) | ⑤ 5) / ⑦ 3) | `GET /chats/{id}/messages` + WebSocket | public shell, API·WebSocket은 Spring 인증 필요 |
| `/chats/notices/?chatId={chatId}` | 메시지 공지 등록·채팅방 공지 고정/해지 | ⑤ 모임채팅 7) | `GET /chats/{id}/notices` | public shell, API는 Spring 인증 필요 |
| `/chats/report/?chatId={chatId}&messageId={messageId}&target={target}` | 채팅 메시지 신고 | — | 신고 API | public shell, 신고 API는 Spring 인증 필요 |
| `/chats/schedule/?chatId={chatId}` | 채팅방 캘린더·일정 | ⑤ 모임채팅 6) | `GET /chats/{id}/events` | public shell, API는 Spring 인증 필요 |
| `/friends/` | 받은 요청·내 친구·닉네임 검색 친구 추가 | ⑤ 모임채팅 2) 3) | `GET /friends`, `GET /friend-requests`, `POST /friend-requests/{id}/accept`, `POST /friend-requests/{id}/reject`, `GET /users?nickname=`, `POST /friends` | public shell, API는 Spring 인증 필요 |

- 꼬리질문 방(`roomType: "question"`)은 연결된 질문 제목을 `useQuestionSummary`로 조회해 방 제목으로 표시한다.
- 꼬리질문 방 더보기 드로어의 대화 상대 국기는 BE #70 응답을 기다리며 프론트는 null-safe 배선을 유지한다.
- 채팅방 더보기 드로어(참여자·알림·나가기)는 URL 없이 채팅방 내부 상태로 처리한다.
- 신고 URL의 `target`은 선택 표시 문자열이다. 식별·인가에 사용하지 않고 React text node로만 출력한다.

### 알림센터

| Canonical URL | 화면 | 백엔드 API | 접근 계약 |
|---|---|---|---|
| `/notifications/` | 알림 목록·읽음·삭제 | `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`, `DELETE /api/v1/notifications/{id}`, `GET /api/v1/sse/subscribe` | protected client gate |

### 마이페이지

| Canonical URL | 화면 | 와이어프레임 | 백엔드 API | 접근 계약 |
|---|---|---|---|---|
| `/my/` | 마이 | ③ 마이페이지 1) | `GET /users/me` | protected client gate |
| `/my/edit/` | 내 정보 수정 (닉네임·국적·비밀번호) | ③ 마이페이지 2) | `PATCH /users/me` | protected client gate |
| `/my/inquiry/` | 운영 문의 등록 | — | `POST /api/v1/inquiries` | protected client gate |
| `/my/notifications/` | 알림 설정 (전체·모임·질문·반경) | ③ 마이페이지 3) | `PATCH /api/v1/users/me/settings` | protected client gate |
| `/my/permissions/` | 카메라·푸시 권한 설정 | ③ 마이페이지 3) | `PATCH /api/v1/users/me/settings` | protected client gate |

### 운영자

| Canonical URL | 화면 | 백엔드 API 그룹 | 접근 계약 |
|---|---|---|---|
| `/admin/` | 운영 지표 대시보드 | `GET /api/v1/admin/stats/users`, `GET /api/v1/admin/stats/content`, `GET /api/v1/admin/stats/reports` | `role=admin` protected gate + desktop-only |
| `/admin/knowledge/` | 지식 관계 후보 검토·승인·거절 | `GET /api/v1/admin/knowledge/relation-candidates`, `GET /api/v1/admin/knowledge/relation-candidates/{candidateId}`, `POST /api/v1/admin/knowledge/relation-candidates/{candidateId}/approve`, `POST /api/v1/admin/knowledge/relation-candidates/{candidateId}/reject` | `role=admin` protected gate + desktop-only |
| `/admin/knowledge/graph/` | 지식 그래프 탐색 | `GET /api/v1/admin/ai/knowledge/graph` | `role=admin` protected gate + desktop-only |
| `/admin/login/` | 운영자 로그인 | `POST /api/v1/auth/login`, `GET /api/v1/users/me` | guest 허용, admin은 대시보드 이동, 일반 사용자는 forbidden/logout + desktop-only |
| `/admin/users/` | 회원 검색·상태 필터 목록 | `GET /api/v1/admin/users` | `role=admin` protected gate + desktop-only |
| `/admin/users/detail/?userId={userId}` | 회원 상세·제재·활성화 | `GET /api/v1/admin/users/{userId}`, `POST /api/v1/admin/users/{userId}/sanctions`, `POST /api/v1/admin/users/{userId}/activate` | `role=admin` protected gate + desktop-only |
| `/admin/reports/` | 신고 필터·목록 | `GET /api/v1/admin/reports` | `role=admin` protected gate + desktop-only |
| `/admin/reports/detail/?reportId={reportId}` | 신고 증거 상세·확정·기각 | `GET /api/v1/admin/reports/{reportId}`, `POST /api/v1/admin/reports/{reportId}/confirm`, `POST /api/v1/admin/reports/{reportId}/dismiss` | `role=admin` protected gate + desktop-only |
| `/admin/inquiries/` | 문의 목록·답변 | `GET /api/v1/admin/inquiries`, `POST /api/v1/admin/inquiries/{inquiryId}/answer` | `role=admin` protected gate + desktop-only |

- 운영자 화면은 `1024px` 이상에서만 기능 UI를 mount한다. 더 작은 viewport에서는 `/api/v1/users/me` 인증 확인만 허용하고 `/api/v1/admin/**` 요청을 시작하지 않는다.
- `userId`와 `reportId`는 positive safe integer query여야 한다. 상세 path literal은 `src/lib/navigation/routes.ts`의 route builder만 소유하며 런타임 `[userId]`·`[reportId]` 디렉터리를 만들지 않는다.
- 정적 HTML 노출은 운영자 권한을 뜻하지 않는다. Spring Security의 `/api/v1/admin/**` `role=admin` 인가가 최종 보안 경계다.
- 이 문서는 FE 정적 라우트의 기준이다. Spring `StaticPageController`, test fixture, JAR package verifier 반영은 `docs/be-map-handoff.md`에 따라 백엔드 worktree가 담당한다.

## 런타임 ID URL 전환표

| 이전 Next 동적 URL | 정적 export Canonical URL | 필수 query |
|---|---|---|
| `/chats/{chatId}` | `/chats/room/?chatId={chatId}` | `chatId` |
| `/chats/{chatId}/notices` | `/chats/notices/?chatId={chatId}` | `chatId` |
| `/chats/{chatId}/report?...` | `/chats/report/?chatId={chatId}&messageId={messageId}&target={target}` | `chatId`, `messageId` |
| `/chats/{chatId}/schedule` | `/chats/schedule/?chatId={chatId}` | `chatId` |
| `/meetups/{meetingId}` | `/meetups/detail/?meetingId={meetingId}` | `meetingId` |
| `/questions/{questionId}` | `/questions/detail/?questionId={questionId}` | `questionId` |

- query 값은 route builder의 `URLSearchParams`로 인코딩한다.
- 이전 숫자 path의 302 호환 처리는 프론트 범위가 아니다. 필요하면 별도 Spring 작업으로 구현한다.
- 런타임 `[questionId]`, `[chatId]`, `[meetingId]` route는 더 이상 존재하지 않는다.

## 인증 라우팅과 서버 인가

`useMe()`가 브라우저 인증 상태의 단일 진실 공급원이다.

| 상태 | `/my/**` | `/login/`, `/join/**` |
|---|---|---|
| 최초 확인 중 | 확인 UI | 확인 UI |
| refresh 중, cached user 없음 | 확인 UI | 확인 UI |
| 사용자 있음 (background refresh 포함) | content | `/`로 replace |
| guest 확정 | `/login/`으로 replace | content |
| network/5xx | retry UI, redirect 없음 | retry UI, redirect 없음 |

- guest-only 정책은 `/login/`과 `/join/**`에 적용한다. `/join/social/`은 layout gate 뒤에서 sessionStorage 토큰도 별도로 검증한다.
- users/me 401 뒤 refresh 및 재시도 결과 반영이 진행되는 동안 cached user가 없으면 `refreshing` 상태로 content를 숨기고, cached user가 있으면 authenticated 상태를 유지한다.
- refresh 401/403만 세션 만료로 처리한다. private query data를 비우고 active public query를 새 세션 기준으로 refetch한 뒤 `['me'] = null`로 둔다.
- refresh network/5xx는 사용자 identity와 cache를 보존한다. 서버 장애를 로그아웃으로 바꾸지 않는다.
- chats, friends, meetups, questions, OAuth callback은 정적 public shell이다. 정적 페이지 노출은 데이터 접근 권한을 뜻하지 않는다.
- Spring Security가 private API, mutation, WebSocket 연결을 최종적으로 인증·인가해야 한다. 프론트 client gate는 보안 경계가 아니다.

## 미구현 또는 URL 미확정 화면

정적 산출물에 없는 화면을 구현된 URL처럼 연결하지 않는다. 구현을 시작할 때 고정 path를 정하고 위 라우트 목록으로 옮긴다.

| 화면 | 상태 | 백엔드 API (예상) |
|---|---|---|
| 비밀번호 찾기 | URL 미확정 | `POST /auth/reset-password` |
| 모임 만들기 | URL 미확정 | `POST /meetups` |
| 질문 작성 (비슷한 질문·답변 확인 포함) | URL 미확정 | `POST /questions`, `GET /questions/similar?q=` |
| 다른 사용자 프로필 | URL 미확정 | `GET /users/{id}` |

## 하단 탭

| 탭 | URL 또는 동작 |
|---|---|
| 홈 | `/` |
| 모임채팅 | `/chats/` |
| 글쓰기 (+) | 모달 → 모임/질문 작성 화면 (URL 미확정) |
| 질문내역 | `/questions/` |
| 마이 | `/my/` |

`/questions/`는 실제 질문 내역 페이지와 정적 산출물을 가진다.

## 변경 규칙

- 새 내부 링크를 문자열로 흩뿌리지 말고 route builder를 추가하거나 재사용한다.
- 새 런타임 ID 화면은 유한한 고정 path와 검증된 query 조합으로 설계한다.
- 라우트 변경 PR은 이 문서와 정적 산출물 검증 목록을 함께 갱신한다.
- 프론트의 route 접근 정책과 Spring API 인가 정책을 별개로 검토한다.
