# BE 착수 문서 — 지도 프록시 (ieum_BE)

> 대상: `ieum_BE` (Spring Boot, `shinhan.fibri.ieum`)
> 목적: 정적 서빙 구조에서 FE가 호출하는 `/api/places/*`를 **Spring이 네이버로 구현**한다.
> FE는 자기 오리진의 `/api/places/*`만 부르고, **외부 키는 Spring 환경변수에만** 둔다.
>
> 상위 문서: [map-implementation.md](./map-implementation.md) · [static-deploy-plan.md](./static-deploy-plan.md)
>
> **FE 계약(경로·응답 shape)은 변경 금지.** FE 코드는 이 계약에 맞춰 이미 작성돼 있다.

---

## 0. 착수 체크리스트 (우선순위 순)

- [ ] **정적 서빙** — FE `out/` 산출물을 `src/main/resources/static/`에 배치·서빙
- [ ] **SPA 폴백** — 미매칭 GET 경로(`/chats/{id}`, `/oauth/...` 등) → `index.html`. **`/api/**`는 폴백 제외**. 안 하면 딥링크/새로고침 404.
- [ ] **COOP 응답 헤더** — 정적 리소스 응답에 `Cross-Origin-Opener-Policy: same-origin-allow-popups` (구글 로그인 팝업용)
- [ ] **`GET /api/places/search`** (출시 필수) — 네이버 지역검색 프록시 (§2)
- [ ] **`GET /api/places/geocode`** (출시 필수) — 주소→좌표, NCP 지오코딩 프록시 (§4)
- [ ] **`GET /api/places/reverse-geocode`** — 좌표→주소, NCP 역지오코딩 프록시 (§3)
- [ ] 환경변수에 키 세팅 (§5), 좌표 범위 검증 (§6)

---

## 1. 키 발급 (김지혜가 준비)

| 용도 | 발급처 | 자격증명 | 비용 |
|------|--------|----------|------|
| 지역검색 (필수) | 네이버 개발자센터 `developers.naver.com` → **검색 API** 사용 신청 | `X-Naver-Client-Id` / `X-Naver-Client-Secret` | 무료(일 25,000회) |
| **지오코딩·역지오코딩 (필수)** | NCP `console.ncloud.com` → **Maps** Application (VPC) | `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key` | 유료(결제 등록 필요) |

- 검색 키는 개인 네이버 계정으로 결제수단 없이 발급 가능 → **김지혜가 발급 완료**.
- **NCP 키 1개로 지오코딩·역지오코딩을 모두 호출**한다(엔드포인트만 다름).
- ⚠️ **지오코딩(주소→좌표)이 출시 필수 기능으로 확정** → NCP 키가 **출시 blocking**. 결제수단 등록이 선행돼야 하므로 **김지혜가 우선 발급**.
  - 결제가 지연되면 임시로 무료 대안(행안부 도로명주소 API / VWorld / OSM Nominatim) 검토 가능하나, 계약(응답 shape)은 아래 그대로 맞춘다.

---

## 2. `GET /api/places/search` — 지역검색 (출시 필수)

**FE 계약 (변경 금지)**
```
GET /api/places/search?query={검색어}&lat={위도}&lng={경도}
→ 200 {
    "places": [
      { "id": string, "name": string, "address": string,
        "lat": number, "lng": number, "categoryGroupName"?: string }
    ]
  }
```
- `query`가 비면 `{ "places": [] }` 반환(외부 호출 없이).
- `lat`/`lng`는 근접 정렬용 힌트(네이버가 직접 못 받음 → §2 정렬 참고).

**네이버 원본 호출**
```
GET https://openapi.naver.com/v1/search/local.json?query={query}&display=5
Headers: X-Naver-Client-Id: {id}
         X-Naver-Client-Secret: {secret}
```

**응답 매핑 (네이버 item → FE Place)**

| FE 필드 | 네이버 원본 | 변환 |
|---------|------------|------|
| `name` | `title` | **`<b>`/`</b>` 태그 제거** (HTML 이스케이프도 정리) |
| `address` | `roadAddress` \|\| `address` | 도로명 우선 |
| `lng` | `mapx` | **`/ 1e7`** (`1270575397` → `127.0575397`) |
| `lat` | `mapy` | **`/ 1e7`** |
| `categoryGroupName` | `category` | 없으면 생략(undefined) |
| `id` | (원본에 안정적 id 없음) | `link` 또는 `name+mapx+mapy` 해시 등으로 생성 |

**⚠️ 네이버 지역검색 제약 (수용됨)**
- 결과 **최대 5개** (`display` 1~5, 실질 페이징 불가).
- **거리순 정렬 미지원** (정렬은 `random`/`comment`만). FE가 `lat/lng`를 넘기지만 네이버는 못 받으므로,
  필요 시 **Spring이 `mapx/mapy`로 거리 계산해 재정렬**.

**에러**
- 네이버 4xx/5xx → FE에 4xx/5xx로 명확히 전달(FE는 검색 실패 UI 폴백).
- 키 미설정 → 500 + 명확한 메시지.

---

## 3. `GET /api/places/reverse-geocode` — 좌표→주소 

**FE 계약 (변경 금지)**
```
GET /api/places/reverse-geocode?lat={위도}&lng={경도}
→ 200 { "fullAddress": string|null, "shortLabel": string|null }
```
- 미구현/실패 시 FE는 "조회 실패" 폴백 → **배포 자체엔 무방**. (출시 후 붙여도 됨)

**제공자: NCP Maps — Reverse Geocoding** (공식 가이드 기준)
> ⚠️ 콘솔에서 Maps Application을 **VPC 플랫폼**으로 등록해야 함(Classic 아님). 엔드포인트 호스트는 신버전 `maps.apigw.ntruss.com`.

```
GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc
      ?coords={경도},{위도}          # ⚠️ X,Y = lng,lat 순서 (FE의 lat/lng를 뒤집어 넣기)
      &orders=roadaddr,addr          # 도로명 우선, 없으면 지번
      &output=json                   # 기본값이 xml이므로 반드시 json 지정
Headers:
  x-ncp-apigw-api-key-id: {NCP_MAPS_KEY_ID}
  x-ncp-apigw-api-key:    {NCP_MAPS_KEY}
```

**응답 구조 (핵심만)** — `status.code` `0`=ok, `3`=결과없음(바다/미지정), `results[]` 각 원소의 `name`이
`roadaddr`/`addr`이고 `region.area1~area4.name`(시도/시군구/읍면동/리) + `land`(번지·도로명·건물)로 쪼개져 옴.
**합쳐진 주소 문자열은 안 오므로 BE가 조립**한다.

```
fullAddress 조립:
  r = results 중 name=="roadaddr" 우선, 없으면 name=="addr"
  · roadaddr(도로명): area1 + area2
                     + (area3가 "읍"/"면"으로 끝날 때만 포함; "동"/"가" 법정동은 제외)
                     + land.name(도로명) + " " + land.number1(+ "-"+land.number2 있으면)
                     + (land.addition0.value 있으면 " ("+건물명+")")   # addition0.type=="building"
  · addr(지번)     : area1 + area2 + area3 + (area4.name 리 있으면)
                     + (land.type=="2"면 "산 ") + land.number1(+ "-"+land.number2)
  status.code==3(결과없음/바다) 또는 results 비면 → fullAddress=null

⚠️ 도로명주소에 법정동(area3)을 그대로 넣으면 "서울특별시 중구 태평로1가 세종대로 110"처럼
   틀린 주소가 된다. area3는 읍/면일 때만 포함 (지번주소는 area3/area4 포함). — 실호출로 확인된 함정.

shortLabel:
  region.area3.name(읍/면/동) → 없으면 area2.name(시/군/구)
```

**실호출 검증 예** (`coords=126.9781113,37.5665087`, 서울시청):
- roadaddr: `area1=서울특별시, area2=중구, area3=태평로1가(법정동→제외), land.name=세종대로, number1=110, 건물=서울특별시청`
  → **`서울특별시 중구 세종대로 110 (서울특별시청)`**
- addr: `... area3=태평로1가, number1=31` → **`서울특별시 중구 태평로1가 31`**

- **에러 코드**: `200/code:0` 정상, `200/code:3` 결과없음(→ null 폴백), `400/100` 파라미터 오류, `500/900` 서버오류.
- 좌표계는 기본 `EPSG:4326`(WGS84 위경도)이라 우리 Leaflet 좌표 그대로 사용 가능(`sourcecrs`/`targetcrs` 생략).
- 결제 부담 시 무료 대안(VWorld/행안부/Nominatim)으로 대체 검토.

---

## 4. `GET /api/places/geocode` — 주소→좌표 (출시 필수)

정형 주소(도로명/지번)를 입력해 정확한 좌표를 얻는다. 지역검색(키워드·최대 5개)과 달리
**주소 매칭이 정확하고 최대 100개**까지 온다. 주소 입력으로 위치를 등록하는 플로우에 사용.

**FE 계약 (신규)**
```
GET /api/places/geocode?query={주소}
→ 200 {
    "addresses": [
      { "roadAddress": string, "jibunAddress": string, "lat": number, "lng": number }
    ]
  }
```
- `query`가 비면 `{ "addresses": [] }` 반환(외부 호출 없이).
- FE는 이 목록을 후보로 보여주고, 사용자가 고른 `lat`/`lng`를 저장/핀에 사용.

**NCP 원본 호출**
```
GET https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query={주소}&count=5
Headers:
  x-ncp-apigw-api-key-id: {NCP_MAPS_KEY_ID}
  x-ncp-apigw-api-key:    {NCP_MAPS_KEY}
  Accept: application/json
```

**응답 매핑 (NCP addresses[] → FE address)**

| FE 필드 | NCP 원본 | 변환 |
|---------|----------|------|
| `roadAddress` | `roadAddress` | 완성 문자열 그대로 (없으면 `""`) |
| `jibunAddress` | `jibunAddress` | 완성 문자열 그대로 |
| `lng` | `x` | `Number(x)` — **이미 실수(°)라 `/1e7` 불필요** |
| `lat` | `y` | `Number(y)` — 동일 |

> ⚠️ 지역검색(`mapx/mapy` 정수 `/1e7`)과 **다름**. 지오코딩 `x`/`y`는 이미 `127.1054328` 형태.

**제약·에러**
- `meta.totalCount`로 총 개수, `count`(1~100, 기본 10)로 페이지 크기. FE엔 상위 N개(기본 5)만 넘겨도 충분.
- 상태코드: `200/OK` 정상, `400/INVALID_REQUEST` 요청 오류, `500/SYSTEM_ERROR` 서버오류.
- 검색 결과 없으면 `addresses: []`(빈 배열)로 정상 200 → FE는 "결과 없음" 표시.

---

## 5. 환경변수 / 설정

BE는 아래 키를 **환경변수(`.env` / 배포 서버 설정)로만** 주입한다. 코드·FE에 하드코딩 금지.
모두 **실호출 200 검증 완료** (검색·지오코딩·역지오코딩).

**`.env` (BE) — 실제 값 Notion 업로드**

**환경변수 → 요청 헤더 매핑**

| 환경변수 | 들어가는 헤더 | 사용 API |
|----------|--------------|----------|
| `NAVER_SEARCH_CLIENT_ID` | `X-Naver-Client-Id` | 지역검색 (§2) |
| `NAVER_SEARCH_CLIENT_SECRET` | `X-Naver-Client-Secret` | 지역검색 (§2) |
| `NCP_MAPS_KEY_ID` | `x-ncp-apigw-api-key-id` | 지오코딩(§4)·역지오코딩(§3) |
| `NCP_MAPS_KEY` | `x-ncp-apigw-api-key` | 지오코딩(§4)·역지오코딩(§3) |

**`application.properties` 참조 예**
```properties
naver.search.client-id=${NAVER_SEARCH_CLIENT_ID}
naver.search.client-secret=${NAVER_SEARCH_CLIENT_SECRET}
ncp.maps.key-id=${NCP_MAPS_KEY_ID}
ncp.maps.key=${NCP_MAPS_KEY}
```

> 🔐 **보안 경고**: 위는 **실제 라이브 키**다. `.env`는 반드시 `.gitignore`, 공개 저장소에 커밋 금지.
> 이 문서(값 포함)가 공개 저장소/외부로 유출되면 **네이버 개발자센터·NCP 콘솔에서 키 재발급** 필요.

---

## 6. 보안 · 안정성

- **좌표 범위 검증**: 한국(위도 ≈ 33~39, 경도 ≈ 124~132) 벗어나면 400으로 조기 차단 → 오남용 방지.
- **호출 한도**: 검색 일 25,000회. 마커 상세는 **클릭 시점 lazy 호출 + 결과 캐싱**으로 절약(FE 협조).
- **좌표 순서/스케일 함정** (엔드포인트별로 다름):
  - 지역검색: `mapx=경도`/`mapy=위도`, **정수 → `/1e7`**
  - 지오코딩: `x=경도`/`y=위도`, **이미 실수 → 변환 없음**
  - 역지오코딩: 입력 `coords=경도,위도` (Leaflet `[위도,경도]`와 반대)

---

## 7. FE 참고 (호출부 위치)

FE는 아래 파일에서 위 경로를 호출한다. 계약만 지키면 FE 변경 불필요.
- `src/features/map/api/place-search-api.ts` — `Place` 타입 정의 + `/api/places/search` 호출
- `src/features/map/api/reverse-geocode-api.ts` — `/api/places/reverse-geocode` 호출
- `src/features/map/api/geocode-api.ts` — **신규 예정**, `/api/places/geocode` 호출(주소→좌표)
- 현재 FE에 남아있는 `src/app/api/places/*`(Kakao route handler)는 **FE 착수 시 삭제** 예정.
