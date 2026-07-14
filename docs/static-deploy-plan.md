# 정적 export 배포 계약

> FE #82는 Next.js 서버를 배포하지 않는다. `next build`가 만든 `out/`만 Spring 인계 산출물로 제공한다.
> Spring 정적 호스팅 구현은 별도 BE PR의 책임이며, 이 문서는 완료를 주장하지 않는다.

## 1. FE 런타임 경계

`next.config.ts`의 배포 관련 설정은 다음 세 항목이다.

```ts
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
}
```

- 운영 프로세스는 Spring/JVM 하나다. `next start`는 사용하지 않는다.
- Proxy, request-time cookie/server fetch/redirect, `next/headers`, route handler에 의존하지 않는다.
- Next 설정의 rewrite, header, redirect로 운영 동작을 만들지 않는다.
- 기본 이미지 optimizer API를 사용하지 않는다. 정적 파일과 API 원본 URL을 그대로 로드한다.
- production REST는 상대 `/api/...`, production WebSocket은 `window.location.origin`의 `/ws`를 사용한다.
- local `next dev`만 `NEXT_PUBLIC_DEV_BACKEND_ORIGIN=http://localhost:8080`처럼 명시적인 backend origin을 허용한다.
- `NEXT_PUBLIC_API_BASE_URL`과 `API_BASE_URL`은 사용하지 않는다.

## 2. 라우트와 인증

런타임 ID는 고정 path + query로 이동했다.

| 리소스 | Canonical URL |
|---|---|
| 채팅방 | `/chats/room/?chatId={chatId}` |
| 공지 | `/chats/notices/?chatId={chatId}` |
| 신고 | `/chats/report/?chatId={chatId}&messageId={messageId}&target={target}` |
| 일정 | `/chats/schedule/?chatId={chatId}` |
| 모임 상세 | `/meetups/detail/?meetingId={meetingId}` |
| 질문 상세 | `/questions/detail/?questionId={questionId}` |

- ID는 `/^[1-9]\d*$/`와 `Number.isSafeInteger`를 모두 통과해야 한다.
- invalid query에서는 data component를 mount하지 않는다.
- `useSearchParams()`는 가장 가까운 `Suspense` 아래에서 읽는다.
- `/my/**`는 `useMe()` 기반 protected client gate다.
- `/login/`과 `/join/`만 exact guest-only다. `/join/social/`의 기존 자체 검증은 그대로 둔다.
- refresh network/5xx는 retry UI를 보여주고 logout시키지 않는다. refresh 401/403만 session-expired로 분류한다.
- `/questions/` 탭과 unslashed `/oauth/kakao/callback` 계약은 유지한다. Kakao callback의 `code`, `state`, `error` query는 경로 보정 과정에서도 유실하면 안 된다.

## 3. FE 빌드·검증

통합 브랜치에서 다음 순서로 실행한다.

```bash
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify`는 pure contract, lint/typecheck, fresh static build, `out/` source/artifact audit를 수행한다. 공유 산출물인 `.next/`와 `out/`은 통합 리더만 생성한다.

검증 대상:

- root, 404, manifest, favicon, PWA icon
- 구현된 각 page의 HTML과 non-empty client navigation payload
- `/_next/static/**`와 local WOFF2
- runtime dynamic app directory, server-only API, Proxy, 금지 환경변수·설정이 소스에 없는지
- `out/` 내부에 server bundle이 포함되지 않고 source에 금지된 server-runtime 설정이 남지 않는지

FE 완료 증거는 정확한 commit SHA, `pnpm verify` 결과, 생성된 `out/`이다. 이 증거만으로 Spring/JAR 배포 완료를 주장하지 않는다.

## 4. Spring 인계 계약 — 별도 BE 작업

### 산출물 고정

- 검증한 정확한 FE SHA에서 `out/.`을 만든다.
- 그 내용을 `app-main/src/main/resources/static/`에 복사한다.
- 다른 FE commit의 산출물을 섞지 않는다.

### Security와 요청 분기

- API, admin, actuator 규칙을 먼저 적용한다.
- 그 뒤 정적 asset·HTML에 대한 `GET`과 `HEAD`만 허용한다.
- 정적 요청에서는 JWT decode와 Redis session validation을 건너뛴다.
- API, WebSocket, SSE는 static forward·HTML fallback·정적 header 처리에서 제외한다.

### 경로·RSC

- `trailingSlash: true` 산출물의 slash canonical을 지킨다.
- no-slash 요청은 slash URL로 redirect하거나, 실제 Next client navigation 요청을 검증한 alias만 제공한다.
- 예외인 unslashed `/oauth/kakao/callback`은 그대로 제공한다. slash alias 또는 redirect를 추가한다면 `code`, `state`, `error`를 포함한 원본 query string을 그대로 보존해야 한다.
- RSC navigation의 `.txt` 요청을 임의로 HTML에 forward하지 않는다.

### 오류·헤더·캐시

- browser 문서 요청의 404 HTML과 API의 `NoResourceFoundException` JSON 응답을 분리한다.
- `.txt`는 `text/plain` 또는 검증된 `text/x-component`로 제공하고 `no-cache`를 적용한다.
- hashed `/_next/static/**`는 immutable cache를 적용한다.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`는 HTML에만 적용한다.

### BE 검증 기준

- static GET·HEAD, slash canonical, RSC `.txt`, HTML 404를 통합 테스트한다.
- Kakao callback의 unslashed 경로와 slash 보정 경로에서 `code`, `state`, `error` query가 보존되는지 통합 테스트한다.
- API/admin/actuator 우선순위와 API/WS/SSE 제외를 통합 테스트한다.
- 정적 요청이 JWT/Redis를 호출하지 않는지 확인한다.
- 실제 JAR에서 exact FE SHA의 asset과 route를 smoke test한다.

## 5. 완료 경계

| 항목 | FE #82 | 별도 Spring PR |
|---|---:|---:|
| 고정 query route와 client auth | O | — |
| production same-origin REST/WS | O | endpoint 제공 |
| `out/` 생성·감사 | O | exact SHA를 `app-main/src/main/resources/static/`에 복사 |
| Spring Security/static forwarding | — | O |
| MIME/cache/COOP/404 | — | O |
| JAR smoke | — | O |

Spring 작업이 merge·검증되기 전에는 “단일 JAR 정적 배포 완료”로 표현하지 않는다.
