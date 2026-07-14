# 이음(Ieum) 라우트 계약

> Next.js 16은 빌드 도구로만 사용한다. 운영에는 `out/` 정적 파일만 배포한다.
> 최종 수정: 2026-07-14 (FE #82 정적 export 전환)

## 기본 원칙

- 내부 이동은 `src/lib/navigation/routes.ts`의 builder를 기준으로 한다.
- `trailingSlash: true`에 맞춰 고정 페이지는 끝에 `/`를 붙인다.
- 루트 `/`와 외부 OAuth 등록값인 `/oauth/kakao/callback`은 예외다. Kakao callback은 끝 `/`를 붙이지 않는다.
- Kakao 지도·장소 API 전환은 Kakao OAuth와 별개다. 로그인 흐름과 callback URI는 변경하지 않는다.
- 런타임 ID는 path segment가 아니라 고정 path의 query로 전달한다. 빌드 시 ID 목록을 열거하지 않는다.
- ID query는 `/^[1-9]\d*$/`와 `Number.isSafeInteger`를 모두 통과해야 한다.
- 잘못된 ID에서는 기존 data component를 mount하지 않는다. 따라서 해당 화면의 API·WebSocket 요청도 시작하지 않는다.
- `useSearchParams()`는 각 page의 가장 가까운 `Suspense` 아래 client child에서만 읽는다.

## 고정 페이지

| Canonical URL | 화면 | 접근 계약 |
|---|---|---|
| `/` | 지도 홈 | public shell |
| `/login/` | 로그인 | 이 경로만 guest-only |
| `/join/` | 회원가입 | 이 경로만 guest-only |
| `/join/social/` | 소셜 회원가입 | 기존 `sessionStorage` 검증 유지, guest-only 아님 |
| `/oauth/kakao/callback` | Kakao callback | public shell, 등록 URI 유지 |
| `/chats/` | 채팅 목록 | public shell, 데이터/API는 서버가 보호 |
| `/friends/` | 친구 목록 | public shell, 데이터/API는 서버가 보호 |
| `/questions/` | 질문 탭 | 기존 탭 경로 유지 |
| `/my/` | 마이 | protected client gate |
| `/my/edit/` | 내 정보 수정 | protected client gate |
| `/my/settings/` | 설정 | protected client gate |

`/questions/`의 목록 화면·탭 정책은 FE #82에서 바꾸지 않는다.

## 런타임 ID 상세 페이지

| 이전 URL | Canonical URL | 필수 query |
|---|---|---|
| `/chats/{chatId}` | `/chats/room/?chatId={chatId}` | `chatId` |
| `/chats/{chatId}/notices` | `/chats/notices/?chatId={chatId}` | `chatId` |
| `/chats/{chatId}/report?...` | `/chats/report/?chatId={chatId}&messageId={messageId}&target={target}` | `chatId`, `messageId` |
| `/chats/{chatId}/schedule` | `/chats/schedule/?chatId={chatId}` | `chatId` |
| `/meetups/{meetingId}` | `/meetups/detail/?meetingId={meetingId}` | `meetingId` |
| `/questions/{questionId}` | `/questions/detail/?questionId={questionId}` | `questionId` |

- `target`은 선택 표시 문자열이다. 식별·인가 판단에 사용하지 않고 React text node로만 출력한다.
- query 값은 route builder의 `URLSearchParams`로 인코딩한다.
- 이전 숫자 path의 302 호환 처리는 FE 범위가 아니다. 필요하면 별도 Spring 작업으로 구현한다.

## 인증 라우팅

`useMe()`가 브라우저 인증 상태의 단일 진실 공급원이다.

| 상태 | `/my/**` | `/login/`, `/join/` |
|---|---|---|
| 확인 중 | 확인 UI | 확인 UI |
| 사용자 있음 | content | `/`로 replace |
| guest 확정 | `/login/`으로 replace | content |
| network/5xx | retry UI, redirect 없음 | retry UI, redirect 없음 |

- refresh 401/403만 세션 만료로 처리한다. private query cache를 비운 뒤 `['me'] = null`로 둔다.
- refresh network/5xx는 사용자 identity와 cache를 보존한다. 서버 장애를 로그아웃으로 바꾸지 않는다.
- chats, friends, meetup, question, callback은 public shell이다. 실제 데이터와 action 인가는 Spring API가 담당한다.

## 하단 탭

| 탭 | URL |
|---|---|
| 홈 | `/` |
| 모임채팅 | `/chats/` |
| 질문내역 | `/questions/` |
| 마이 | `/my/` |

글쓰기 버튼의 화면 정책과 `/questions/` 탭 정책은 이 전환에서 변경하지 않는다.

## 변경 규칙

- 새 내부 링크를 문자열로 흩뿌리지 말고 route builder를 추가하거나 재사용한다.
- 새 runtime ID 화면은 유한한 고정 path와 검증된 query 조합으로 설계한다.
- 라우트 변경 PR은 이 문서와 정적 산출물 검증 목록을 함께 갱신한다.
