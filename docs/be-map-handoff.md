# BE 착수 문서 — 지도 프록시 (ieum_BE)

> 대상: `ieum_BE` (Spring Boot, `shinhan.fibri.ieum`)
> 목적: 정적 서빙 구조에서 FE가 호출하는 `/api/places/*`를 **Spring이 네이버로 구현**한다.
> FE는 자기 오리진의 `/api/places/*`만 부르고, **외부 키는 Spring 환경변수에만** 둔다.
>
> 상위 문서: [map-implementation.md](./map-implementation.md) · [ROUTES.md](./ROUTES.md) · [Next static export 설계](./superpowers/specs/2026-07-14-next-static-export-migration-design.md)
>
> **FE 계약(경로·응답 shape)은 변경 금지.** FE 코드는 이 계약에 맞춰 이미 작성돼 있다.
>
> **상태:** 이 문서는 별도 Spring PR의 착수 계약이다. 현재 문서 변경만으로 Spring/JAR 구현·테스트가 끝났다고 보지 않는다.

---

## 0. 착수 체크리스트 (우선순위 순)

- [ ] 검증한 **정확한 FE SHA**에서 만든 `out/.`을 `app-main/src/main/resources/static/`에 복사
- [ ] API·admin·actuator 규칙 뒤에 static `GET`·`HEAD` 허용 규칙 배치
- [ ] static 요청에서 JWT decode와 Redis session validation 생략
- [ ] 아래 canonical 목록의 root + 25개 구현 route 전체를 Spring forward/controller/JAR smoke에서 검증
- [ ] trailing slash canonical과 실제 Next client navigation의 RSC `.txt` 요청 처리 검증
- [ ] `/oauth/kakao/callback/`을 Kakao 개발자 콘솔·Spring allowlist·FE와 동일하게 등록
- [ ] browser HTML 404와 `NoResourceFoundException` API JSON 응답 분리
- [ ] HTML·`404.html`·모든 RSC `.txt`·`manifest.webmanifest`에는 no-cache, hashed `/_next/static/**`에만 immutable cache 적용
- [ ] `Cross-Origin-Opener-Policy: same-origin-allow-popups`를 HTML에만 적용
- [ ] API·WebSocket·SSE를 HTML forward와 static header 처리에서 제외
- [ ] **`GET /api/places/search`** (출시 필수) — 네이버 지역검색 프록시 (§2)
- [ ] **`GET /api/places/geocode`** (출시 필수) — 주소→좌표, NCP 지오코딩 프록시 (§4)
- [ ] **`GET /api/places/reverse-geocode`** (선택·출시 후) — 좌표→주소, NCP 역지오코딩 프록시 (§3)
- [ ] 승인된 배포 환경 secret 설정에 자격증명 주입 (§5), 좌표 범위 검증 (§6)

---

## A. 정적 호스팅 계약 — 별도 BE PR

### 산출물과 경로

- FE SHA와 `out/` 생성 로그를 함께 기록한다. 다른 commit의 파일을 섞지 않는다.
- `trailingSlash: true` 산출물은 route별 `index.html`과 client navigation payload를 포함한다.
- no-slash URL은 slash canonical로 redirect하거나, 실제 브라우저 요청을 캡처해 검증한 alias만 제공한다.
- 모든 미매칭 경로를 루트 HTML로 보내는 포괄 fallback은 사용하지 않는다. 특히 `.txt`와 API 경로를 HTML로 바꾸면 안 된다.

### Spring forward/controller/JAR smoke canonical 목록

이 목록은 FE `scripts/ci/verify-static-export.sh`의 root + 25개 구현 route와 정확히 같아야 한다. Spring controller test와 실제 JAR smoke는 일부 대표 route만 검사하지 않고 아래 전체를 고정한다. query string은 forward 대상을 바꾸지 않으며 browser URL에 보존한다.

| Canonical URL | Spring static target |
|---|---|
| `/` | `/index.html` |
| `/admin/` | `/admin/index.html` |
| `/admin/inquiries/` | `/admin/inquiries/index.html` |
| `/admin/login/` | `/admin/login/index.html` |
| `/admin/reports/` | `/admin/reports/index.html` |
| `/admin/reports/detail/` | `/admin/reports/detail/index.html` |
| `/admin/users/` | `/admin/users/index.html` |
| `/admin/users/detail/` | `/admin/users/detail/index.html` |
| `/chats/` | `/chats/index.html` |
| `/chats/notices/` | `/chats/notices/index.html` |
| `/chats/report/` | `/chats/report/index.html` |
| `/chats/room/` | `/chats/room/index.html` |
| `/chats/schedule/` | `/chats/schedule/index.html` |
| `/friends/` | `/friends/index.html` |
| `/join/` | `/join/index.html` |
| `/join/social/` | `/join/social/index.html` |
| `/login/` | `/login/index.html` |
| `/meetups/detail/` | `/meetups/detail/index.html` |
| `/my/` | `/my/index.html` |
| `/my/edit/` | `/my/edit/index.html` |
| `/my/inquiry/` | `/my/inquiry/index.html` |
| `/my/notifications/` | `/my/notifications/index.html` |
| `/my/permissions/` | `/my/permissions/index.html` |
| `/oauth/kakao/callback/` | `/oauth/kakao/callback/index.html` |
| `/questions/` | `/questions/index.html` |
| `/questions/detail/` | `/questions/detail/index.html` |

root를 제외한 no-slash 요청은 query를 보존한 slash canonical redirect 또는 검증된 alias로만 처리한다. `/questions/`도 다른 구현 route와 같은 필수 mapping이며 누락을 허용하지 않는다.

### Security와 요청 분기

- API, admin, actuator matcher를 먼저 평가한다.
- static asset·HTML은 그 뒤에 `GET`·`HEAD`만 허용한다.
- static 요청은 JWT/Redis 세션 검증 대상이 아니다.
- `/api/**`, `/ws/**`, SSE endpoint는 static forwarding·404 fallback·COOP 처리에서 제외한다.

### MIME·cache·오류

- route HTML과 root `404.html`: `Cache-Control: no-cache`.
- 모든 RSC `.txt`(`index.txt`, 중첩 `__next.*.txt` 포함): `text/plain` 또는 실제 응답에서 확인한 `text/x-component`, `Cache-Control: no-cache`.
- `manifest.webmanifest`: `Cache-Control: no-cache`.
- hashed `/_next/static/**`만 `Cache-Control: public, max-age=31536000, immutable`.
- 이름이 고정된 icon/favicon 같은 다른 자산에는 immutable을 일괄 적용하지 않는다.
- HTML: `Cross-Origin-Opener-Policy: same-origin-allow-popups`; JS/CSS/image에는 일괄 적용하지 않는다.
- browser 문서 404는 FE `404.html`로, API의 `NoResourceFoundException`은 기존 JSON 오류 계약으로 응답한다.

### 필수 검증

- canonical 목록 전체의 static GET/HEAD, canonical slash, `.txt`, browser 404를 통합 테스트한다.
- API/admin/actuator 우선순위와 API/WS/SSE 제외를 통합 테스트한다.
- static 요청에서 JWT decode·Redis access가 발생하지 않는지 확인한다.
- 실제 JAR로 root + 25개 구현 route의 HTML과 `index.txt`를 모두 smoke test한다.
- header 통합 테스트는 route HTML·`404.html`·RSC `index.txt`·중첩 `__next.*.txt`·`manifest.webmanifest`의 no-cache와 hashed `/_next/static/**`의 정확한 immutable 값을 각각 검증한다.

복사 또는 `bootJar` 단계가 segment payload를 누락하지 않았음은 대표 파일 몇 개가 아니라 모든 `.txt` 목록의 완전 일치로 증명한다.

```bash
find frontend/out -type f -name '*.txt' -print \
  | sed 's#^frontend/out/#BOOT-INF/classes/static/#' \
  | LC_ALL=C sort > /tmp/frontend-rsc-files.txt

jar tf app-main/build/libs/*.jar \
  | grep -E '^BOOT-INF/classes/static/.*\.txt$' \
  | LC_ALL=C sort > /tmp/bootjar-rsc-files.txt

diff -u /tmp/frontend-rsc-files.txt /tmp/bootjar-rsc-files.txt
```

이 diff에는 root/route `index.txt`뿐 아니라 빌드가 생성한 모든 중첩 `__next.*.txt`가 포함되어야 한다.

이 절의 체크가 별도 BE PR과 JAR smoke에서 통과하기 전에는 Spring 정적 배포 완료로 기록하지 않는다.

---

## 1. 자격증명 발급 상태

| 용도 | 발급처 | 자격증명 | 비용 | 상태 |
|------|--------|----------|------|------|
| 지역검색 (출시 필수) | 네이버 개발자센터 `developers.naver.com` → **검색 API** | `X-Naver-Client-Id` / `X-Naver-Client-Secret` | 무료(일 25,000회) | 발급 완료 |
| 지오코딩 (출시 필수) | NCP `console.ncloud.com` → **Maps** Application (VPC) | `x-ncp-apigw-api-key-id` / `x-ncp-apigw-api-key` | 유료(결제 등록 필요) | 발급 대기 |
| 역지오코딩 (선택·출시 후) | NCP Maps | 지오코딩과 같은 NCP 자격증명 | NCP 요금 적용 | NCP 발급 후 사용 가능 |

- 이 문서에는 환경변수 이름과 placeholder만 있으며 실제 secret 값은 없다.
- 발급된 검색 자격증명과 향후 NCP 자격증명은 팀이 승인한 비밀 저장소와 배포 환경 secret 설정에만 보관한다.
- **NCP 자격증명 1세트로 지오코딩·역지오코딩을 모두 호출**한다(엔드포인트만 다름).
- ⚠️ **지오코딩(주소→좌표)이 출시 필수 기능**이므로 NCP 자격증명 발급은 release blocking이다. 역지오코딩은 선택·출시 후 범위다.
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

## 3. `GET /api/places/reverse-geocode` — 좌표→주소 (선택·출시 후)

**FE 계약 (변경 금지)**
```
GET /api/places/reverse-geocode?lat={위도}&lng={경도}
→ 200 { "fullAddress": string|null, "shortLabel": string|null }
```
- release blocking이 아니다. 미구현/실패 시 FE는 "조회 실패" 폴백을 사용하며 출시 후 붙일 수 있다.

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

**응답 조립 예** (`coords=126.9781113,37.5665087`, 서울시청):
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

BE는 아래 자격증명을 **배포 환경 secret 설정으로만** 주입한다. 코드·FE·문서에 값을 하드코딩하지 않는다.
검색 자격증명은 발급 완료, NCP 자격증명은 발급 대기 상태다. 이 상태는 Spring endpoint 또는 JAR 검증 완료를 뜻하지 않는다.

**문서에는 실제 값 없음 — 아래는 환경변수 이름과 매핑만 표시**

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

> 🔐 실제 secret 값은 팀이 승인한 비밀 저장소와 배포 환경 secret 설정에만 둔다. Git, 일반 문서, 채팅에 복사하지 않는다.
> 값이 노출되면 해당 provider에서 즉시 폐기·재발급하고 배포 secret을 교체한다.

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
- `src/features/map/api/geocode-api.ts` — `/api/places/geocode` 호출(주소→좌표)
- FE는 Next route handler 없이 상대 `/api/places/*`를 호출한다. 세 endpoint 구현은 Spring 책임이다.
