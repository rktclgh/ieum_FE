# 이음(Ieum) 라우트 맵

> 프론트엔드 URL 구조 문서 
> 라우트를 추가·변경할 때는 반드시 이 문서를 같은 PR에서 함께 수정합니다
>
> - 와이어프레임: [Figma – 신한해커톤 와이어프레임](https://www.figma.com/design/FPRPYHC1ukJph6hjRiyU0Z/?node-id=782-1049)
> - 생성: 2026-07-02
> - 최종 수정: 2026-07-14 (질문 내역·답변 보기·꼬리질문 채팅 라우트 확정)


## 네이밍 규칙

1. **소문자 + kebab-case** — `/my-page`
2. **컬렉션은 복수형 명사** — `/questions`, `/meetups` (백엔드 REST 리소스명과 일치시킴)
3. **동사 금지, 예외는 `new` / `edit`** — `/questions/new`, `/my/edit`
4. **동적 세그먼트는 `[리소스명Id]`** — `[id]` 대신 `[questionId]`
5. **현재는 깊이 1단계까지만 확정** — 2단계 이상 하위 화면은 와이어프레임이 있어도 URL을 미리 고정하지 않는다. 아래 [하위 화면 (URL 미확정)](#하위-화면-url-미확정) 표에 화면명만 기록해두고, 실제 구현을 시작하는 시점에 담당자가 이 문서에서 라우트를 확정해 [라우트 목록](#라우트-목록)으로 옮긴다.
6. **정체성은 path, 상태는 query** — 필터·정렬·탭·검색어는 쿼리스트링으로

## 라우트 그룹 구조

```
src/app/
├── (auth)/          # 하단 탭바 없음 (로그인 전)
└── (main)/          # 하단 탭바 있음 (홈 · 모임채팅 · 글쓰기 · 질문내역 · 마이)
```

## 라우트 목록

### (auth) — 인증

| URL | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/login` | 로그인 (아이디·비밀번호, 소셜, 언어설정) | ① 로그인 | `POST /auth/login` | X |
| `/join` | 회원가입 — 계정 만들기 (이후 프로필 설정 단계 있음, 하위 화면 참고) | ② 회원가입 | `POST /auth/signup` | X |
| `/reset-password` | 비밀번호 찾기 | ① 로그인 | `POST /auth/reset-password` | X |

### (main) — 홈 (지도 기반)

| URL | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/` | 지도 홈 | ④ 홈 1) | `GET /meetups?bounds=`, `GET /questions?bounds=` | X |
| `/?pin={id}&type=meetup\|question` | 핀 선택 (바텀시트) | ④ 홈 2) 3) | 상동 | X |
| `/?view=list` | 주변 둘러보기 — 리스트 보기 | ④ 홈 4) | 상동 | X |
| `/notifications` | 알림센터 | ④ 홈 5) | `GET /notifications` | O |

> 핀 선택·리스트 전환은 "같은 지도 화면의 상태"이므로 별도 경로가 아닌 **query param**으로 처리한다. (뒤로가기·링크 공유는 유지됨)

### (main) — 모임 & 질문 (글쓰기 포함)

| URL | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/questions` | 내 질문 내역 (롱프레스 삭제) | ⑦ 질문 내역 1) | `GET /api/v1/questions/me`, `DELETE /api/v1/questions/{id}` | O |
| `/questions/[questionId]` | 질문 상세 · 답변 보기 (작성자 뷰: 채택·채팅 시작·신고 / 답변자 뷰: 답변 입력) | ⑦ 질문 내역 2) | `GET /questions/{id}`, `POST /questions/{id}/answer`, `POST /answers/{id}/accept`, `POST /chat/rooms/question`(BE #68), `POST /answers/{id}/report`(BE #69) | X (답변·채택·채팅·신고는 O) |

> 모임 상세·모임 만들기·질문 작성은 하위 화면(2단계 이상)이라 URL 미확정. [하위 화면](#하위-화면-url-미확정) 참고.
> 질문 상세(`/questions/[questionId]`)는 `useMe`로 작성자/답변자 뷰를 분기한다. 작성자 국기·작성시각은 BE #64 대기(FE는 필드만 준비). 채팅 시작·답변 신고는 BE #68/#69 배포 전까지 계약우선 스텁(미구현 시 안내 토스트).
> 하단 탭 가운데 **글쓰기(+) 버튼**은 모달로 열고, 모임/질문 토글에 따라 각각의 작성 화면으로 이동한다 (라우트는 미확정).

### (main) — 채팅 & 소셜

| URL | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/chats` | 채팅 목록 (그룹 + 1:1 꼬리질문) | ⑤ 모임채팅 1) | `GET /chats` | O |
| `/chats/[chatId]` | 채팅방 (그룹채팅 · 꼬리질문 채팅 공용) | ⑤ 5) / ⑦ 3) | `GET /chats/{id}/messages` (+ WebSocket) | O |

> 꼬리질문 방(`roomType:"question"`)은 제목을 연결된 질문 제목으로 표시한다(`useQuestionSummary`). 더보기 드로어 대화상대 국기는 BE #70 대기(FE는 null-safe 배선 완료).
| `/chats/[chatId]/notices` | 채팅방 공지 (메시지를 공지로 등록 · 채팅방 공지 고정/해지) | ⑤ 모임채팅 7) | `GET /chats/{id}/notices` | O |
| `/chats/[chatId]/schedule` | 채팅방 캘린더 · 일정 | ⑤ 모임채팅 6) | `GET /chats/{id}/events` | O |
| `/friends` | 친구 목록 (받은 요청 · 내 친구 · 닉네임 검색으로 친구 추가) | ⑤ 모임채팅 2) 3) | `GET /friends`, `GET /friend-requests`, `POST /friend-requests/{id}/accept`, `POST /friend-requests/{id}/reject`, `GET /users?nickname=`, `POST /friends` | O |

> 다른 사용자 프로필은 하위 화면이라 URL 미확정. [하위 화면](#하위-화면-url-미확정) 참고.
> 채팅방의 **더보기 드로어**(⑤ 8: 참여자·알림·나가기)는 URL 없이 채팅방 내부 상태로 처리한다.

### (main) — 마이페이지

| URL | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/my` | 마이 | ③ 마이페이지 1) | `GET /users/me` | O |

> 내 정보 수정·알림 설정은 하위 화면이라 URL 미확정. [하위 화면](#하위-화면-url-미확정) 참고.

## 하위 화면 (URL 미확정)

> 와이어프레임은 있지만 URL 경로(깊이 2단계 이상)는 아직 확정하지 않았다. **화면 구현을 시작하는 시점에 담당자가 실제 라우트를 정해 위 [라우트 목록](#라우트-목록) 표로 옮긴다.** "상위 라우트" 컬럼은 참고용 소속 표시이며 실제 하위 URL 구조를 확정하는 것은 아니다.

| 상위 라우트 | 화면 이름 | 와이어프레임 | 백엔드 API (예상) | 로그인 |
|---|---|---|---|---|
| `/join` | 회원가입 2/2 — 프로필 설정 (닉네임·국적·성별·생일) | ② 회원가입 | `PATCH /users/me` | X |
| `/meetups` | 모임 상세 (참여하기 → 그룹채팅 입장) | ④ 홈 2) | `GET /meetups/{id}`, `POST /meetups/{id}/join` | X (참여는 O) |
| `/meetups` | 모임 만들기 | ⑥ 글쓰기 1) | `POST /meetups` | O |
| `/questions` | 질문 작성 (비슷한 질문·답변 확인 단계 포함) | ⑥ 글쓰기 2) 3) | `POST /questions`, `GET /questions/similar?q=` | O |
| — | 다른 사용자 프로필 | ⑤ 모임채팅 4) | `GET /users/{id}` | O |
| `/my` | 내 정보 수정 (닉네임·국적·비밀번호) | ③ 마이페이지 2) | `PATCH /users/me` | O |
| `/my` | 알림 설정 (모임·질문 알림, 반경, 권한) | ③ 마이페이지 3) | `PATCH /users/me/notification-settings` | O |

## 하단 탭 ↔ 라우트 매핑

| 탭 | 라우트 |
|---|---|
| 홈 | `/` |
| 모임채팅 | `/chats` |
| 글쓰기 (+) | 모달 → 모임/질문 작성 화면 (라우트 미확정) |
| 질문내역 | `/questions` |
| 마이 | `/my` |

## 직군별 약속

- **백엔드**: 표의 "백엔드 API (예상)" 컬럼은 프론트 기준 초안입니다. 실제 스펙과 다르면 이 문서를 기준으로 맞추거나, 여기 컬럼을 수정해주세요. 원칙은 **페이지 리소스명 = API 리소스명** (`/questions` ↔ `GET /questions`).
- **디자이너**: Figma 프레임 이름을 URL 기준으로 지어주세요. 예) `questions-list`, `questions-detail`, `chats-room`. 새 화면이 생기면 우선 [하위 화면](#하위-화면-url-미확정) 표에 행을 추가합니다.
- **프론트**: 라우트 추가/변경 PR에는 이 문서 수정이 반드시 포함되어야 합니다. 하위 화면 구현을 시작할 때는 해당 행을 [하위 화면](#하위-화면-url-미확정) 표에서 [라우트 목록](#라우트-목록) 표로 옮기고 실제 URL을 채웁니다.
