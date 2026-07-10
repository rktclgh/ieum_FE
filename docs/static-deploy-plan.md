# 정적 배포 전환 계획 (Spring static serving)

> 배포 방식 결정: **Spring(ieum_BE)이 FE 빌드 산출물을 static resource로 서빙.**
> FE·BE 같은 오리진 → 쿠키 세션/CSRF same-origin 전제 그대로 성립.
> Next.js Node 프로세스 불필요 → `output: "export"` 로 정적 빌드.
>
> 관련 문서: [map-implementation.md](./map-implementation.md) (6번 체크리스트가 이 전환을 이미 전제)

## 배경 결정

- **카카오 API 전체 미사용** (로그인·장소검색 포함). 무료 제공자로 대체.
- **장소 검색 = 출시 필수 기능.** 제공자 = **네이버 지역검색**(무료). 정적 서빙에선 시크릿 키가
  브라우저에 못 올라가므로 **Spring이 `/api/places/search`를 반드시 구현**해야 함 → BE 출시 blocking 의존성.
- **지도 검색/역지오코딩:** FE 호출부(`/api/places/*`)는 **그대로 유지**, Next route handler만 삭제.
  Spring이 같은 경로를 네이버로 구현하면 FE 코드 변경 없이 동작.
- **진행:** 지금은 계획/핸드오프 문서만. 실제 코드 리팩터링은 별도 착수.

---

## FE 작업 (착수 시 이 순서로)

### 1. `next.config.ts` — export 모드 전환
- [ ] `output: "export"` 추가
- [ ] `images: { unoptimized: true }` 추가 (export는 이미지 최적화 서버가 없음)
- [ ] `headers()`(COOP) 제거 → **Spring으로 이전** (BE 핸드오프 참고)
- [ ] `rewrites()` 제거하되, **로컬 dev 편의는 조건부 유지**:
  ```ts
  const isDev = process.env.NODE_ENV === "development"
  const nextConfig: NextConfig = {
    output: "export",
    images: { unoptimized: true },
    ...(isDev && {
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${API_BASE_URL}/api/:path*` }]
      },
    }),
  }
  ```
  > export 빌드에선 rewrites가 무시되므로 dev에서만 켜서 로컬→백엔드 프록시를 살린다.

### 2. Kakao route handler 삭제
- [ ] `src/app/api/places/search/route.ts` 삭제
- [ ] `src/app/api/places/reverse-geocode/route.ts` 삭제
- [ ] `src/app/api/` 아래 다른 route handler 없는지 확인 (있으면 전부 export 불가 → 이전 대상)
- [ ] FE 호출부는 **유지**: `features/map/api/{place-search-api,reverse-geocode-api}.ts`, 관련 훅
- [ ] `.env.local`의 `KAKAO_REST_API_KEY` 제거 (FE에서 더 이상 안 씀)

### 3. 미들웨어 → 클라이언트 가드 (`src/proxy.ts` 정적 미동작)
현재 [src/proxy.ts](../src/proxy.ts)가 쿠키 존재로 리다이렉트: `/login`·`/join`(게스트 전용)→로그인 시 홈, `/my`(보호)→비로그인 시 로그인.
- [ ] `/login`·`/join`: 이미 `useGuestGuard`(클라 refresh 체크) 존재 → 각 페이지에 적용됐는지 확인, 안 됐으면 적용
- [ ] `/my`: **클라이언트 보호 가드 신설** (아래 4번과 함께)
- [ ] `src/proxy.ts` 삭제 (export에서 실행 안 됨)

### 4. `my/page.tsx` 서버렌더 → 클라이언트 전환
현재 [my/page.tsx](../src/app/my/page.tsx)가 서버에서 `getMeServer()` + `redirect()` + `dehydrate`. 정적 불가.
- [ ] 서버 컴포넌트 제거 → `"use client"` + `useQuery(["me"])` 클라 페치
- [ ] 미인증 시 클라이언트에서 `router.replace("/login")`
- [ ] `features/session/api/session-server-api.ts`(getMeServer) 사용처 정리

### 5. 동적 라우트 `chats/[chatId]/*` → 클라이언트 렌더 + 정적 파라미터
현재 4개 페이지가 서버에서 `params` 읽고 `notFound()`. export는 `generateStaticParams` 필요.
- [ ] 각 페이지: 얇은 서버 래퍼(`generateStaticParams`만) + `"use client"` 내용 컴포넌트로 분리
  - `generateStaticParams`는 현재 mock 기준 `MOCK_CHATS`의 id들 반환 (실 백엔드 채팅 붙으면 재검토)
  - 내용 컴포넌트는 `useParams()`로 `chatId` 읽기
- [ ] `notFound()` → 클라이언트에서 "없는 채팅" 폴백 UI 또는 `router.replace`
- [ ] **BE SPA 폴백 없으면** mock 외 id는 새로고침 시 404 (BE 핸드오프 참고)

### 6. 빌드 검증
- [ ] `pnpm build` → `out/` 생성 확인 (export 산출물 폴더)
- [ ] `npx serve out` 등으로 로컬에서 라우팅/딥링크 스모크 테스트
- [ ] Spring `src/main/resources/static/`에 `out/` 내용 배치 방식 BE와 합의

---

## BE 핸드오프 (ieum_BE 팀에 전달)

1. **정적 서빙** — FE `out/` 산출물을 `src/main/resources/static/`(또는 동등 경로)에 배치·서빙.
2. **SPA 폴백** — 매칭 안 되는 GET 경로(`/chats/{id}`, `/oauth/...` 등)는 `index.html`로 폴백.
   안 하면 딥링크/새로고침 404. (`/api/**` 는 폴백 제외)
3. **COOP 응답 헤더** — 구글 로그인 팝업용. 정적 리소스 응답에 추가:
   ```
   Cross-Origin-Opener-Policy: same-origin-allow-popups
   ```
4. **`GET /api/places/search`** — 장소 검색, **출시 필수**. 제공자 = **네이버 지역검색**(무료).
   - **FE 계약(변경 금지):** `GET /api/places/search?query=&lat=&lng=`
     → `{ "places": [ { "id": string, "name": string, "address": string, "lat": number, "lng": number, "categoryGroupName"?: string } ] }`
   - 네이버 원본: `GET https://openapi.naver.com/v1/search/local.json?query=&display=5`
     헤더 `X-Naver-Client-Id` / `X-Naver-Client-Secret` (네이버 개발자센터 앱 등록, 무료).
   - **매핑:** `title`→`name`(단 **`<b>`/`</b>` 태그 제거**), `roadAddress`||`address`→`address`,
     `mapx`→`lng`, `mapy`→`lat` (**둘 다 `/1e7`**, 예 `1270575397`→`127.0575397`), `category`→`categoryGroupName`.
   - **⚠️ 제약(수용됨):** ① 결과 **최대 5개**(`display` 1~5, 페이징 실질 불가) ② **거리순 정렬 미지원**
     → FE가 `lat/lng`(near)를 넘기지만 네이버는 못 받으므로, 필요 시 **Spring이 `mapx/mapy`로 거리 계산해 재정렬**.
   - 외부 키는 Spring 환경변수에만.
5. **`GET /api/places/reverse-geocode`** (좌표→주소) — 검색보다 후순위. 제공자 미정(무료: VWorld/OSM Nominatim 등).
   - FE 계약: `GET /api/places/reverse-geocode?lat=&lng=` → `{ fullAddress, shortLabel }`
   - 미구현 시 FE는 "조회 실패" 폴백(배포엔 무방).

---

## 열린 이슈 / 리스크

- **딥링크 404**: SPA 폴백은 BE 필수 작업. 없으면 `/chats/{id}` 새로고침·공유링크 깨짐.
- **oauth 콜백 경로**: `oauth/kakao/callback`은 카카오 미사용이면 사실상 dead. 유지/삭제 결정 필요(정적 export 자체엔 무해 — client 컴포넌트).
- **dev 환경 인증**: rewrites를 dev에서만 켜므로 로컬은 여전히 same-origin 프록시로 동작. prod는 Spring이 같은 오리진이라 문제없음.
- **실 채팅 데이터**: `chats/[chatId]`의 `generateStaticParams`가 현재 mock 기준. 실 백엔드 채팅 연동 시 "런타임 id + SPA 폴백" 구조로 재정비 필요.
