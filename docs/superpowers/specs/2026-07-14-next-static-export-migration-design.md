# Next 정적 Export 전환 설계

## 목적

Next.js 16.2.9는 빌드 도구로만 사용하고, 운영 런타임은 Spring Boot 하나만 남긴다. FE는 `next build`가 생성한 `out/`만 배포 계약으로 제공하며 `next start`, Proxy, request-time cookie/server fetch, rewrite/header/redirect, 기본 이미지 최적화 API에 의존하지 않는다.

검토 기준은 FE 저장소의 `82-정적-export-전환...` 브랜치와 `84f7f575`이다. 기존 72번 CI/CD 워크트리에서 작성된 대형 계획은 방향 참고 자료로만 사용한다. 이 설계는 82번 FE PR의 범위를 정의한다.

## 범위

이번 PR이 소유한다.

- runtime ID 동적 segment 6개를 고정 path + query page로 전환
- 모든 관련 내부 이동을 중앙 route helper로 수렴
- `/my/**`의 server cookie/fetch/redirect를 client `useMe()` 기반 gate로 교체
- 실제 Proxy 동작을 보존해 `/login`과 `/join`만 guest-only로 전환
- refresh 401/403과 backend network/5xx를 분리하고 private query cache를 정리
- production REST/WS를 browser same-origin으로 고정하고 local dev origin만 명시적으로 허용
- Geist Mono 외부 다운로드와 Next 이미지 optimizer 제거
- 기존 lint 5 errors/3 warnings 해소
- static export source/artifact 계약과 로컬 `pnpm verify` 추가
- 현행 route/deployment 문서 갱신

이번 PR이 소유하지 않는다.

- 72번 CI/CD 브랜치의 FE dispatch workflow 복원 또는 수정
- BE `resources/static` 복사, Spring Security, static forwarding, 404, COOP/cache 구현
- `/questions` 목록 화면 또는 탭 정책 변경
- `/join/social`을 새로 guest-only로 만드는 정책 확대
- OAuth provider console에 등록된 Kakao callback URI 변경
- legacy numeric URL 302 controller 구현

## URL 계약

| 기존 URL | 새 canonical URL |
|---|---|
| `/chats/{chatId}` | `/chats/room/?chatId={chatId}` |
| `/chats/{chatId}/notices` | `/chats/notices/?chatId={chatId}` |
| `/chats/{chatId}/report?messageId=...&target=...` | `/chats/report/?chatId=...&messageId=...&target=...` |
| `/chats/{chatId}/schedule` | `/chats/schedule/?chatId={chatId}` |
| `/meetups/{meetingId}` | `/meetups/detail/?meetingId={meetingId}` |
| `/questions/{questionId}` | `/questions/detail/?questionId={questionId}` |

ID는 `/^[1-9]\d*$/`와 `Number.isSafeInteger`를 모두 통과해야 한다. 잘못된 query에서는 data component를 mount하지 않아 API/WS 요청을 만들지 않는다. `target`은 표시 문자열일 뿐 식별/권한 판단에 사용하지 않고 React text node로만 출력한다.

`useSearchParams()`는 각 page의 가장 가까운 `Suspense` 안에서만 호출한다. `trailingSlash: true`로 route별 `index.html`과 client navigation payload를 생성한다.

## 인증 계약

- `/my/**`: protected client gate
- `/login`, `/join`: guest-only client gate
- `/join/social`: 기존 sessionStorage 자체 검증 유지, 새 guest-only gate 없음
- chats/friends/meetup/question/callback: public shell 유지, 실제 데이터/action은 Spring API가 보호

`useMe()`가 인증의 단일 진실 공급원이다.

| 상태 | 의미 | gate 동작 |
|---|---|---|
| pending | 최초 users/me 진행 중 | checking UI |
| user | 인증됨 | protected content, guest-only는 `/` replace |
| null | refresh까지 끝난 guest | protected는 `/login/` replace |
| error | network/5xx | redirect 없이 retry UI |

Axios refresh는 기존 single-flight와 original request 1회 retry를 유지한다. refresh 401/403만 session-expired event를 발행하고 모든 query를 비운 뒤 `["me"] = null`로 만든다. refresh network/5xx는 캐시와 identity를 보존한다. password login, 기존 social login, social signup 성공은 모두 `["me"]`를 invalidate한다.

## transport와 빌드 계약

- production REST: 상대 `/api/...`
- production WS: `window.location.origin`에서 `/ws`를 만들고 HTTP→WS, HTTPS→WSS
- local dev만 `NEXT_PUBLIC_DEV_BACKEND_ORIGIN=http://localhost:8080` 허용
- `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL` 사용 금지
- `next.config.ts`: `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`만 배포 관련 설정으로 유지
- Geist Mono 제거, local Pretendard 유지
- `next start`, `src/proxy.ts`, `next/headers`, `session-server-api`, runtime dynamic app directory 제거

`typecheck`는 stale `.next/types`를 피하도록 `next typegen && tsc --noEmit --incremental false`로 실행한다.

## Spring 인계 계약

FE PR 완료는 Spring 배포 완료를 뜻하지 않는다. BE 호환 PR은 다음을 별도로 구현해야 한다.

- exact FE SHA에서 `out/.`을 `app-main/src/main/resources/static/`에 복사
- static GET과 HEAD 허용, API/admin/actuator 규칙은 그보다 먼저 적용
- static 요청에서 JWT decode/Redis session validation skip
- no-slash path는 slash canonical로 redirect하거나 실제 Next RSC 요청 규칙을 검증한 alias 제공
- `.txt`는 `text/plain` 또는 `text/x-component`, no-cache
- hashed `/_next/static/**`는 immutable cache
- COOP는 HTML에만 `same-origin-allow-popups`
- `GlobalExceptionHandler`의 `NoResourceFoundException` JSON 처리와 browser HTML 404를 분리
- API/WS/SSE가 HTML forward/header 로직에 잡히지 않음을 통합 테스트

## 검증

자동 검증은 pure Node contracts → lint/typecheck → fresh static build → artifact/source audit 순서다. 빌드는 공유 출력인 `.next/`와 `out/`을 쓰므로 leader 통합 워크트리에서만 실행한다.

최종 수동 smoke는 valid/invalid query, my auth matrix, password/Google/Kakao login cache 갱신, same-origin WS, API thumbnail 원본 로드, mobile route state를 확인한다. Spring/JAR smoke는 BE 호환 PR에서 수행한다.

