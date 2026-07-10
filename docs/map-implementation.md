# 지도 기능 구현 가이드 (ieum) — 단일 소스

> Leaflet + CARTO 타일 위에 **네이버 검색/지오코딩/역지오코딩 데이터**만 얹어서
> "장소 검색 → 마커/상세", "주소 입력 → 좌표 등록", "클릭 → 좌표/주소 표출"을 구현하기 위한 정리 문서.
>
> 스택: **FE** `ieum_FE` (Next.js App Router, Leaflet) / **BE** `ieum_BE` (Spring Boot, `shinhan.fibri.ieum`)
> 배포: **Spring 서버가 FE 빌드 산출물(정적)을 서빙** → FE·BE 같은 오리진
> 외부 지도 제공자: **Kakao 전면 폐기 → 네이버로 전환** (아래 2번)
>
> 관련 문서:
> - [be-map-handoff.md](./be-map-handoff.md) — BE 착수 문서(엔드포인트 계약·매핑·키)
> - [static-deploy-plan.md](./static-deploy-plan.md) — 정적 export 전환 전반(인증/라우팅 포함)

---

## 1. 전체 구조

```
[브라우저]
  Leaflet(CARTO 타일)  ── 화면 렌더링 / 마커 표시만 담당
        │  (같은 오리진, CORS 없음)
        ▼
[Spring 서버 (ieum_BE)]
  · 정적 리소스(FE out/) 서빙 + SPA 폴백
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
> 현재 FE의 `app/api/places/*`(Kakao 호출) 로직은 삭제하고 **Spring 컨트롤러로 이전**한다.

---

## 2. 외부 API & 발급해야 하는 키 (⚠️ 핵심)

기능이 성격이 달라 **발급처가 둘로 나뉜다.**

| 용도 | 제공자 / 발급처 | 자격증명(헤더) | 비용 | 담당 |
|------|----------------|----------------|------|------|
| **장소·키워드 검색** (출시 필수) | 네이버 개발자센터 `developers.naver.com` → **검색 API** | `X-Naver-Client-Id` / `X-Naver-Client-Secret` | **무료** (일 25,000회) | 김지혜 발급 완료  |
| **주소→좌표 (지오코딩) · 좌표→주소 (역지오코딩)** (출시 필수) | 네이버 클라우드 플랫폼(NCP) `console.ncloud.com` → **Maps (VPC)** | `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key` | 유료(무료 제공량 有) | 김지혜 발급 예정 |
| **지도 타일 렌더링** | — (Leaflet+CARTO 유지) | **불필요** | — | — |

> **NCP 키 1개로 지오코딩·역지오코딩 둘 다** 호출한다(엔드포인트만 다름). 지오코딩(주소→좌표)이 **출시 필수**라 NCP 키는 이제 **출시 blocking**(후순위 아님).

**발급 액션**
1. **검색 키(무료·지금)** — 네이버 개발자센터 로그인 → 애플리케이션 등록 → **"검색" API 사용 신청** → Client ID/Secret 확보. 개인 네이버 계정이면 결제수단 없이 가능.
2. **NCP 키(유료·출시 필수)** — NCP 콘솔 → **결제수단 등록** → Maps Application(VPC) 등록 → API Key 확보. 지오코딩·역지오코딩 공용. 결제 지연 시 임시로 무료 대안(행안부 도로명주소 API / VWorld / OSM Nominatim) 검토(계약 shape은 동일 유지).

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

### 3-3. 좌표 → 주소 (역지오코딩)
- `/api/places/reverse-geocode?lat=&lng=` 호출 → `{ fullAddress, shortLabel }`.
- FE 호출부(`features/map/api/reverse-geocode-api.ts`)·훅(`use-reverse-geocode.ts`)은 **경로 그대로 유지** → Spring이 받으면 FE 무변경.
- 역지오코딩 미구현 시 FE는 "조회 실패" 폴백(배포 무방).

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

## 4. 프론트엔드(ieum_FE) 착수 순서

정적 export 전환과 세트다. 상세는 [static-deploy-plan.md](./static-deploy-plan.md).

- [ ] `app/api/places/search/route.ts`, `app/api/places/reverse-geocode/route.ts` **삭제** (→ Spring 이전)
- [ ] `.env.local`의 `KAKAO_REST_API_KEY` 제거
- [ ] FE 호출부/훅(`features/map/api/*`, `use-place-search`, `use-reverse-geocode`)은 **유지** (경로 계약 불변)
- [ ] **신규: `features/map/api/geocode-api.ts` + `use-geocode.ts`** (주소→좌표, `/api/places/geocode`) + 주소 입력 UI
- [ ] `next.config.ts`: `output:"export"` + `images:{unoptimized:true}`, `headers`(COOP)·`rewrites` 정리(rewrites는 dev 전용 조건부)
- [ ] 미들웨어/서버렌더 페이지 정적 대응(인증 클라 가드) — 지도 외지만 export에 딸려옴
- [ ] (선택) 3-7 follow-me 추적
- [ ] `pnpm build` → `out/` 생성·딥링크 스모크 테스트

---

## 5. 지연(latency)과 UX

- 정상 배포·병렬·캐시 미적중 기준 **클릭 후 체감 300~500ms**. 순차 호출 시 400~900ms → **반드시 병렬(`Promise.all`)**.
- 같은 좌표 재조회는 캐시 적중 시 거의 즉시.
- 클릭 즉시 마커부터 찍고 "조회 중…" 스켈레톤 → 응답 채우는 **낙관적 UI**.
- Spring 상시 구동이라 서버리스 콜드 스타트 없음(정적 서빙 장점).

---

## 6. 요약

1. 지도 타일 = Leaflet+CARTO 렌더링. 외부 지도 API = **데이터 공급원**.
2. 세 기능 모두 **Spring 프록시**로, 키는 서버에만:
   - 키워드 검색 → **지역검색**(개발자센터, 무료 키)
   - 주소→좌표 → **지오코딩**(NCP, 유료 키) — 출시 필수
   - 좌표→주소 → **역지오코딩**(NCP, 같은 키)
3. 좌표 순서/스케일이 엔드포인트마다 다름 — 지역검색 `mapx/mapy /1e7`, **지오코딩 `x/y` 변환 없음**, 역지오코딩 입력 `coords=경도,위도`.
4. 주소·POI는 **병렬 + 캐싱 + 낙관적 UI**로 체감 지연 최소화.
5. 정적 배포 전환 시 route handler·rewrites·미들웨어·동적 라우트 함께 정리.
