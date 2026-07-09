# 친구 기능(#29) 연동 테스트

> `features/friends` 백엔드 연동(#29)의 코드 감사 결과 + 로컬 E2E 테스트 시나리오.
> 백엔드 체크리스트(`ieum_BE/docs/frontend-integration-checklist.md`) 기준. 기준일: 2026-07-09.

---

## 사전 준비

- **프론트**: `pnpm dev` (:3000). `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` (프록시 없음, 크로스오리진). 단 `:3000`↔`:8080`은 same-site라 로컬에선 SameSite=Lax 쿠키가 전송됨. **운영 도메인 분리 시엔 별도 대응 필요.**
- **백엔드(실제 실행 환경)**: 로컬 Postgres가 아니라 **SSH 터널로 배포 RDS(운영, PostGIS)** 에 연결하는 구조. 로컬 Redis는 세션/토큰용.
  ```
  [프론트 :3000] --XHR(credentials)--> [백엔드 :8080]
                                           └ localhost:5432 ──SSH터널──> RDS PostgreSQL(운영)
                                             localhost:6379 ──> 로컬 Redis
  ```
  - `brew services stop postgresql@18` (로컬 5432 비우기) → SSH 터널(redis는 6380으로 우회) → `COOKIE_SECURE=false AWS_S3_BUCKET=ieum-prod-files AWS_REGION=ap-northeast-2 ./gradlew :app-main:bootRun`
  - AWS 자격증명은 **OS 환경변수로** 줘야 함(`.env` 키로는 `S3 bucket is required`로 기동 실패).
  - `COOKIE_SECURE=false`는 런타임 오버라이드로 적용 — http://localhost에서 쿠키 저장의 전제.
- **⚠️ 운영 RDS write 주의**: T4~T8(요청·수락·거절·삭제·차단)은 **운영 DB에 실제 반영**됨. **테스트 전용 계정 2개(A·B)로만** 진행하고, 끝나면 생성된 친구관계/차단을 정리할 것. 실 사용자 계정으로 요청 보내지 말 것.
- **테스트 계정 생성**: `.env`에 실제 Gmail SMTP가 설정돼 있어 인증코드가 실제 발송됨 → `send-code`→`verify`→`signup`→`login` 정식 가입 플로우로 A·B(서로 다른 이메일)를 만들 수 있음.

---

## 0. 네트워크 계약 검증 (curl, ✅ 완료 — 2026-07-09)

로그인 없이 안전하게 확인 가능한 백엔드 계약. 실측 결과:

| 검증 | 결과 |
|---|---|
| 미인증 `GET /api/v1/friends` | `401 {"code":"AUTHENTICATION_REQUIRED"}` ✅ |
| `/actuator/health` | `404` (actuator 미포함 — 헬스체크로 기동 판단 금지) ✅ |
| CORS preflight (GET) | `Allow-Origin: http://localhost:3000` + `Allow-Credentials: true` ✅ |
| CORS preflight (POST) | `Allow-Headers: x-csrf-token, content-type` ✅ (CSRF 헤더 허용) |

→ `apiClient`의 `withCredentials` + `X-CSRF-Token` 인터셉터가 이 백엔드와 동작함이 확인됨. 이하 T0~T13은 실 로그인/브라우저 필요.

---

## 1. 체크리스트 코드 감사 결과

| 항목 | 상태 | 근거 |
|---|---|---|
| 🔴 모든 요청 쿠키 포함 | ✅ | `src/lib/api/client.ts` `withCredentials`, 친구 호출 전부 apiClient 경유 |
| 🔴 CSRF 헤더(POST/DELETE) | ✅ | client.ts 인터셉터가 non-GET에 `X-CSRF-Token` 자동, GET은 스킵 |
| 🟠 userId number | ✅ | `friend-types.ts`, `removeFriend(userId)` → `/friends/${userId}` |
| 🟠 isFriend 키 그대로 | ✅ | `friend-adapter.ts` `user.isFriend` 사용 |
| 🟠 active/lastActiveAt 온라인 표시 | ⚠️ 미구현 | `active`는 어댑터에 담기만 하고 UI 미표시, `lastActiveAt` 매핑 안 함 |
| 🟠 nationality ISO2 + fallback | ✅ | `fromIso2` 역맵, 매핑 없으면 국기 숨김 |
| 🟠 profileImageUrl null→기본 아바타 | ✅ | `file-url.ts` null→undefined→ChatProfile 기본 아바타 |
| 🟡 direction 필수 | ✅ | `useFriendRequests("received")` |
| 🟡 수락 시 invalidate 2개 | ✅ | mutation이 `["friends"]` prefix 무효화 → list·requests 동시 갱신 |
| 🟡 검색 디바운스/enabled/IME | ✅ | `use-debounced-value` 300ms, `enabled: length>0`, IME 가드 없음 |
| 🟡 에러 code→i18n fallback | ✅ | `friend-error.ts` default 폴백 |
| 🟢 401→refresh 재시도+루프가드 | ✅ | client.ts dedup + `_retried` + bootstrap 제외 |

### 발견된 갭
1. **온라인 상태(`active`)·`lastActiveAt` "n분 전" 미표시** — 체크리스트 2순위 항목(원래 mock UI도 미표시). 추가 가능.
2. `/friends` 라우트에 **비로그인 가드 없음**(my-page엔 있음) → 미로그인 시 에러 상태만 노출.
3. 프로필 이미지: 로컬은 same-site라 표시 예상, **운영 도메인 분리 시 백엔드 `SameSite=None; Secure` 필요**.

---

## 2. E2E 테스트 시나리오

| # | 시나리오 | 절차 | 기대 결과 / 확인 |
|---|---|---|---|
| **T0** | 쿠키 스모크 | A 로그인 후 DevTools **Application → Cookies** | `access_token`·`csrf_token` 저장됨. `GET /users/me` 200 (안 되면 `COOKIE_SECURE` 문제) |
| **T1** | 친구 목록 조회 | `/friends` 진입 | `GET /friends` 200, 목록 렌더. 친구 0명이면 "아직 친구가 없어요" |
| **T2** | 사용자 검색 | 검색창에 B 닉네임 입력 | 타건마다가 아닌 **~300ms 후 1회** `GET /users/search` 호출(Network). `isFriend=false`면 [친구 요청] 버튼 |
| **T3** | 검색 디바운스/빈값 | 빠르게 타이핑 후 전체 삭제 | 입력 중 요청 최소화, 빈 문자열이면 요청 안 나감. 결과 없으면 "검색 결과가 없어요" |
| **T4** | 친구 요청 보내기 | 검색 결과 B에 [친구 요청] | **Network에서 `POST /friends/{B}`에 `X-CSRF-Token` 헤더 실림 + 204**. 버튼 "요청됨"으로 변경 |
| **T5** | 받은 요청 수락 | B로 로그인→A에게 요청 / A로 재로그인→목록 | A `/friends` 상단 "받은 친구 요청"에 B. [수락] → **요청목록에서 사라지고 내 친구에 추가**(두 쿼리 동시 갱신) |
| **T6** | 요청 거절 | 받은 요청에서 [거절] | 확인 다이얼로그 → `DELETE /friends/{id}` 204, 목록에서 제거 |
| **T7** | 친구 삭제 | 내 친구 행 **롱프레스** → 삭제 | 컨텍스트 메뉴(차단/삭제) → 삭제 확인 다이얼로그 → 204, 제거 |
| **T8** | 차단 | 내 친구 롱프레스 → 차단 | 차단 확인 다이얼로그 → `POST /friends/{id}/block` 204 |
| **T9** | 에러: 이미 친구/중복 요청 | 이미 친구이거나 이미 요청한 유저에게 요청 | 하단 토스트 매핑 메시지("이미 친구예요"/"이미 친구 요청을 보냈어요") 2.5초 노출 |
| **T10** | 에러: 차단 관계 | 차단한 유저에게 액션 | `403 BLOCKED` → "차단 관계라 진행할 수 없어요" 토스트 |
| **T11** | 401 refresh | 로그인 후 Application에서 `access_token`만 삭제 → 친구 액션 | `POST /auth/refresh` 자동 호출 후 원요청 1회 재시도 성공(Network). **refresh/logout은 CSRF 예외가 아님 → 요청에 `X-CSRF-Token` 헤더 실렸는지 확인.** `csrf_token`은 세션 쿠키라 브라우저 완전 종료 후 첫 refresh는 403 가능 → 재로그인 유도되면 정상 |
| **T12** | i18n | 언어 토글 변경 후 빈/에러 상태 유발 | 빈 상태·에러 토스트가 선택 언어로 표시(7개 언어) |
| **T13** | 프로필 이미지 (fallback) | 프로필 사진 있는 유저 표시 | **로컬엔 AWS 자격증명이 없어 `GET /files/{id}` 스트리밍은 403/실패가 정상.** 기대: 응답 JSON의 `profileImageUrl`은 정상이나 `<img>` 로드만 실패 → **null/실패 시 기본 아바타 fallback이 뜨는지** 확인 |

### 응답 키 검증 (체크리스트 권장)
T1/T2에서 Network 응답 JSON이 `isFriend`·`active` (Java record라 `is` 안 뗀 형태)인지 1회 눈으로 확인.

---

## 3. 관련 참고
- 백엔드 체크리스트: `ieum_BE/docs/frontend-integration-checklist.md`
- 친구 API 상세: `ieum_BE/docs/friend-api.md` / 전체: `ieum_BE/docs/api-reference.md`
- PR: #32 (feat/#29 → develop)
