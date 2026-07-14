# 지도 기능 구현 가이드 (ieum) — 단일 소스

> Leaflet + CARTO 타일 위에 **네이버 검색/지오코딩/역지오코딩 데이터**만 얹어서
> "장소 검색 → 마커/상세", "주소 입력 → 좌표 등록", "클릭 → 좌표/주소 표출"을 구현하기 위한 정리 문서.
>
> 스택: **FE** `ieum_FE` (Next.js App Router, Leaflet) / **BE** `ieum_BE` (Spring Boot, `shinhan.fibri.ieum`)
> 배포 계약: FE는 `out/`만 만들고, 별도 Spring 작업이 exact FE SHA의 산출물을 `app-main/src/main/resources/static/`에서 같은 오리진으로 서빙
> 지도·장소 제공자: **Kakao 지도/장소 API는 사용하지 않고 네이버로 전환** (아래 2번)
> Kakao OAuth callback canonical은 `/oauth/kakao/callback/`이며 개발자 콘솔·Spring allowlist와 일치해야 함
>
> 관련 문서:
> - [be-map-handoff.md](./be-map-handoff.md) — BE 착수 문서(엔드포인트 계약·매핑·키)
> - [ROUTES.md](./ROUTES.md) — 정적 export 라우트·인증 계약
> - [Next static export 설계](./superpowers/specs/2026-07-14-next-static-export-migration-design.md) — 런타임·Spring 인계 경계

---

## 1. 전체 구조

```
[브라우저]
  Leaflet(CARTO 타일)  ── 화면 렌더링 / 마커 표시만 담당
        │  (같은 오리진, CORS 없음)
        ▼
[Spring 서버 (ieum_BE)]
  · exact FE SHA의 out/ 정적 서빙 + slash/RSC 요청 계약
  · /api/v1/*        → 도메인 API (유저/채팅 등)
  · /api/places/*    → 네이버 검색·지오코딩·역지오코딩 프록시  ← 외부 지도 API 키는 여기에만
        │
        ▼
[외부 지도 API]  네이버 개발자센터(검색) / 네이버 클라우드 플랫폼(지오코딩·역지오코딩)
```

**핵심 원칙**
- 지도 타일 렌더링은 Leaflet + CARTO가 담당(기존 유지). 외부 지도 API는 **데이터 공급원** 역할만.
- 외부 API 키는 **절대 브라우저로 내려보내지 않는다.** 반드시 Spring에서 호출.
- FE는 외부 API를 직접 부르지 않고, **자기 오리진의 `/api/places/*`** 만 호출한다.

> ⚠️ 정적 서빙 구조에서는 Next.js `app/api/*` route handler가 **동작하지 않는다.**
> FE에는 `app/api/places/*` handler를 두지 않는다. `/api/places/*` 구현은 **별도 Spring 작업**이다.

---

## 2. 외부 API 자격증명 상태 (⚠️ 핵심)

기능이 성격이 달라 **발급처가 둘로 나뉜다.**

| 용도 | 제공자 / 발급처 | 자격증명(헤더) | 비용 | 상태 |
|------|----------------|----------------|------|------|
| **장소·키워드 검색** (출시 필수) | 네이버 개발자센터 `developers.naver.com` → **검색 API** | `X-Naver-Client-Id` / `X-Naver-Client-Secret` | **무료** (일 25,000회) | 발급 완료, 값은 승인된 비밀 저장소에만 보관 |
| **주소→좌표 (지오코딩)** (출시 필수) | 네이버 클라우드 플랫폼(NCP) `console.ncloud.com` → **Maps (VPC)** | `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key` | 유료(무료 제공량 有) | 발급 대기 |
| **좌표→주소 (역지오코딩)** (선택·출시 후) | NCP Maps (지오코딩과 공유) | 지오코딩과 같은 NCP 자격증명 | NCP 요금 적용 | NCP 자격증명 발급 후 사용 가능 |
| **지도 타일 렌더링** | — (Leaflet+CARTO 유지) | **불필요** | — | 해당 없음 |

이 문서에는 secret 이름과 placeholder만 있으며 실제 secret 값은 없다. 발급된 검색 자격증명과 향후 NCP 자격증명은 팀이 승인한 비밀 저장소와 배포 환경 secret 설정에만 둔다.

> **NCP 자격증명 1세트로 지오코딩·역지오코딩 둘 다** 호출한다(엔드포인트만 다름). 출시 blocking인 기능은 주소→좌표 지오코딩이며, 역지오코딩은 선택·출시 후 범위다.

**발급 액션**
1. **검색 자격증명(발급 완료)** — 값은 승인된 비밀 저장소에서만 관리하고 배포 환경에 secret으로 주입한다.
2. **NCP 자격증명(발급 대기·출시 필수)** — NCP 콘솔에서 결제수단과 Maps Application(VPC)을 준비한다. 지오코딩·역지오코딩이 공유한다. 지연 시 무료 대안을 검토하되 FE 응답 계약은 유지한다.

**엔드포인트/좌표 규칙**
- 검색(개발자센터): `GET https://openapi.naver.com/v1/search/local.json?query=&display=5`
- 지오코딩(NCP): `GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query={주소}` (헤더 `Accept: application/json`)
- 역지오코딩(NCP): `GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords={lng},{위도}&orders=roadaddr,addr&output=json`
- 좌표 순서/스케일 (실수 최다):
  - Leaflet `[lat, lng]`
  - 지역검색 `mapx=경도(lng)`·`mapy=위도(lat)`, **정수라 `/ 1e7` 필수** (`1270575397` → `127.0575397`)
  - 지오코딩 `x=경도`·`y=위도`, **이미 실수(°)라 변환 없음** (`127.1054328`)
  - 역지오코딩 `coords={경도},{위도}` — **경도,위도 순서** (Leaflet과 반대)
- 지오코딩·역지오코딩 상세 계약·매핑은 [be-map-handoff.md §3·§4](./be-map-handoff.md) 참조.

---

## 3. 기능별 구현 방법

### 3-1. 지도 렌더링 (기존 유지)
- `features/map/constants/map.ts` 상수 + `map-canvas.tsx`의 `<TileLayer>` 그대로.
- CARTO Positron `light_all`, 서브도메인 `a~d`, 최대 줌 20, 레티나 `{r}` 2x, 기본 중심 서울시청(37.5665, 126.978), 기본 줌 16.
- 위치 권한 거부/실패 시 서울시청 폴백(기존 로직 유지).

### 3-2. 클릭 → 새 좌표 얻기
- 외부 API 불필요. Leaflet 클릭 이벤트가 위경도를 그대로 준다.

```ts
map.on("click", (e) => {
  const { lat, lng } = e.latlng   // 여기서 좌표 확보
})
```

### 3-3. 좌표 → 주소 (역지오코딩, 선택·출시 후)
- `/api/places/reverse-geocode?lat=&lng=` 호출 → `{ fullAddress, shortLabel }`.
- FE 호출부(`features/map/api/reverse-geocode-api.ts`)·훅(`use-reverse-geocode.ts`)은 **경로 그대로 유지** → Spring이 받으면 FE 무변경.
- 역지오코딩은 release blocking이 아니다. 미구현 시 FE는 "조회 실패" 폴백을 사용하며 출시 후 붙일 수 있다.

### 3-4. 상호·POI 검색 (OSM 상호 부족 보완, 출시 필수)
- CARTO/OSM 타일엔 국내 상호가 희박 → 상호·업종·주소는 네이버 지역검색으로 채운다.
- `/api/places/search?query=&lat=&lng=` 호출 → `{ places: [...] }`.
- FE 호출부(`features/map/api/place-search-api.ts`)·훅(`use-place-search.ts`)은 그대로.

### 3-5. 주소 → 좌표 (지오코딩, 출시 필수)
- 사용자가 **정확한 주소를 직접 입력**해 위치를 등록하는 플로우. 키워드 검색(3-4)보다 주소 매칭이 정확.
- `/api/places/geocode?query={주소}` 호출 → `{ addresses: [{ roadAddress, jibunAddress, lat, lng }] }`.
- 후보 목록을 보여주고, 사용자가 고른 `lat`/`lng`를 저장/핀에 사용.
- FE 신규 파일: `features/map/api/geocode-api.ts` + 훅(`use-geocode.ts`) + 주소 입력 UI(해당 화면 확정 시).
- 지역검색(3-4)과 응답 shape이 다름(POI 아님, 주소 중심). `x`/`y`는 이미 실수라 `/1e7` 불필요.

### 3-6. 저장된 좌표를 마커로 표시 + 상세정보
1. DB(Spring)에서 좌표 목록을 받아 `L.marker([lat, lng])`로 표시.
2. 마커 클릭 시 팝업 채우기: 주소(3-3) + 상호/업종(3-4). **두 호출은 독립이므로 `Promise.all` 병렬.**
3. 마커별 조회 결과 캐싱해 재클릭 재호출 방지.

```ts
map.on("click", async (e) => {
  const { lat, lng } = e.latlng
  const marker = L.marker([lat, lng]).addTo(map)
  marker.bindPopup("주소 조회 중…").openPopup()   // 낙관적 UI
  const [addr] = await Promise.all([reverseGeocode(lat, lng)])
  marker.setPopupContent(addr.fullAddress ?? "주소 조회 실패")
})
```

### 3-7. 내 위치 실시간 따라가기 (follow-me, 선택)
- 위치 버튼을 **토글**로. `watchPosition`으로 추적, `clearWatch`로 해제. **외부 API 불필요**, 정적 배포와 무관.
- 위치 갱신마다 라이브 마커 + 정확도 원 갱신, `setView`로 recenter(follow). **지도 드래그 시 follow 자동 해제**.
- 배터리: `enableHighAccuracy: true`는 GPS 소모 큼 → off 시 반드시 `clearWatch`.
- 변경: `use-geolocation.ts`(watch/clear 추가), `map-controls.tsx`(토글), `home-map-screen.tsx`(라이브 마커·recenter).
- **PWA 제약**: 포그라운드 추적은 iOS(13.4+)/Android PWA OK. **백그라운드/화면 잠금 시 중단**(JS 정지, 웹 공통 한계). HTTPS 필수. **실기기 https 검증 필수**(데스크톱은 GPS 없어 체감 안 됨).

---

## 4. 프론트엔드(ieum_FE) 현재 계약

정적 export와 지도 호출의 경계는 [ROUTES.md](./ROUTES.md)와 [Next static export 설계](./superpowers/specs/2026-07-14-next-static-export-migration-design.md)를 따른다.

- FE 지도 API는 상대 경로 `/api/places/search`, `/api/places/geocode`, `/api/places/reverse-geocode`만 호출한다.
- production REST와 WebSocket은 브라우저 same-origin이다.
- local `next dev`만 `NEXT_PUBLIC_DEV_BACKEND_ORIGIN`으로 Spring origin을 명시할 수 있다.
- Next route handler, Proxy, 운영 rewrite/header, request-time cookie/server fetch는 사용하지 않는다.
- 배포 산출물은 `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`로 만든 `out/`이다.
- 런타임 상세 화면은 여섯 고정 query route를 사용하며 ID는 strict positive safe integer로 검증한다.
- `/my/**`는 `useMe()` 기반 client gate다. `/login/`과 `/join/**`는 guest-only이며 `/join/social/`은 sessionStorage 검증도 유지한다.
- follow-me 추적은 지도 기능의 선택 범위이며 정적 배포 계약과 분리한다.

---

## 5. 응답성과 UX

- 서로 독립적인 주소·POI 조회는 `Promise.all`로 병렬 처리한다.
- 같은 좌표의 결과는 query cache를 재사용한다.
- 클릭 직후 마커와 "조회 중…" 상태를 먼저 보여주고 응답으로 내용을 채운다.
- 실제 지연 수치는 배포 환경에서 측정해 기록한다. 이 문서에서는 검증하지 않은 수치를 제시하지 않는다.

---

## 6. 요약

1. 지도 타일 = Leaflet+CARTO 렌더링. 외부 지도 API = **데이터 공급원**.
2. 세 기능 모두 **Spring 프록시**로, 자격증명은 승인된 서버 비밀 저장소에만 둔다:
   - 키워드 검색 → **지역검색**(개발자센터) — 출시 필수, 자격증명 발급 완료
   - 주소→좌표 → **지오코딩**(NCP, 유료 키) — 출시 필수
   - 좌표→주소 → **역지오코딩**(NCP, 같은 자격증명) — 선택·출시 후
3. 좌표 순서/스케일이 엔드포인트마다 다름 — 지역검색 `mapx/mapy /1e7`, **지오코딩 `x/y` 변환 없음**, 역지오코딩 입력 `coords=경도,위도`.
4. 주소·POI는 **병렬 + 캐싱 + 낙관적 UI**로 체감 지연 최소화.
5. FE는 build-only 정적 앱이며, Spring 정적 호스팅·MIME/cache/404/security는 별도 BE 작업으로 검증한다.
