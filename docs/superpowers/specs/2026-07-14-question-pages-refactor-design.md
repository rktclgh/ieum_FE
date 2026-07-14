# 질문 페이지 전면 리팩토링 — 설계

- 작성일: 2026-07-14
- 대상: `src/features/question` + 관련 `src/features/chat` 채팅방 화면
- 기준 디자인: Figma 신한해커톤 노드 1722-13489 / 1722-13490 / 1744-10029 / 1744-10030 / 958-4520 / 1722-13148
- 브랜치: 새 이슈 등록 후 `feat/#<new>` (워크트리 격리)

## 배경 / 목표

`feat/#76`으로 구현된 현재 질문 화면들이 최신 Figma와 인터랙션·레이아웃이 어긋나 있다. 6개 화면을
Figma에 맞춰 전면 정렬하고, 롱프레스 인터랙션을 재사용 프리미티브로 통일한다. 답변 채택 흐름을
"채택 → 채팅 시작 → 채팅방 진입" 토글로 바꾼다.

### 확정 결정 (사용자)

1. 답변 채택: **여러 답변 채택 가능** (각 답변 독립 토글, 질문 resolved로 잠그지 않음)
2. 답변 신고: **그 답변만 목록에서 제거** (질문/채팅방은 유지)
3. 채팅창·더보기 화면: **이번 범위 포함** (Figma 정렬)
4. BE 미구현: **FE 흐름 전부 구현 + 계약우선 스텁 + BE 이슈 등록**
5. 질문 수정 시 장소: **수정 가능하게** (BE `UpdateQuestionRequest`에 location 추가 요청)
6. 이슈/브랜치: **새 이슈 등록 후 그 번호로**

## 백엔드 갭 (api-endpoints.md + 컨트롤러 대조 확정)

| 필요 기능 | 필요 엔드포인트/필드 | BE 현황 | 처리 |
|---|---|---|---|
| 질문 수정 | `PATCH /api/v1/questions/{id}` (+ location 필드) | ❌ 없음 | 계약우선 + BE 이슈 |
| 리스트 본문 미리보기 | `MyQuestionItem.contentPreview` | ❌ 없음 | 계약우선 + BE 이슈 |
| 답변 신고 | `POST /api/v1/answers/{id}/report` | ❌ 없음 (메시지 신고만) | 계약우선(#69) + BE 이슈 |
| 답변 작성자 국기 | `AuthorSummary.nationality` | ❌ 없음 | 계약우선(#73), 없으면 국기 생략 |
| 채팅 시작(질문방 생성) | `POST /api/v1/chat/rooms/question` | ❌ 없음 (`/rooms/direct`만) | 계약우선 + BE 이슈 |

지금 완전 동작: 답변 채택(`POST /answers/{id}/accept`), 질문 삭제(`DELETE /questions/{id}`).

계약우선 스텁 정책: FE api 클라이언트 함수 + 타입은 지금 정의(일부 이미 존재)하고, 화면은
정상 흐름을 완성한다. BE 미구현 엔드포인트는 실패 시 기존 에러 토스트로 우아하게 처리한다.

## 공통 신규 프리미티브: LongPressActionOverlay

현재 롱프레스는 `chat/components/chat-context-menu`(화면 중앙 고정)라 Figma의 "눌린 행이 흰 카드로
떠오르고 배경 dim + 그 행에 앵커된 액션 메뉴" 연출을 못 낸다. 이를 재사용 컴포넌트로 신설한다.

- 위치: `src/features/question/components/long-press-action-overlay.tsx`
  (질문·답변 롱프레스 공용. 채팅 도메인 의존을 끊기 위해 question 도메인에 둠. 이후 재사용처가
  늘면 `components/ui`로 승격 검토.)
- 책임: (1) 전체 dim 배경 + 바깥/ESC 클릭 시 dismiss, (2) 눌린 요소의 **활성 클론**을 원래 위치에
  흰 카드로 부상(위아래 padding 10px, 폭 375→343px 축소), (3) 클론 옆/아래에 앵커된 액션 메뉴.
- Props: `anchorRect`(눌린 행의 DOMRect), `renderActiveRow`(부상시킬 행 렌더), `items`(아이콘·라벨·
  tone·onClick), `onDismiss`.
- 상호작용: 활성 행 자체 탭 = dismiss. 메뉴 항목 탭 = 해당 action 후 dismiss.
- 접근성: `role="menu"` / 항목 `role="menuitem"`, dim 배경 `aria-hidden`, ESC 처리.

기존 `useLongPress`(chat) 훅은 그대로 재사용한다.

## 화면별 설계

### ① 질문 리스트 — `questions-list-page-content` / `question-history-item`

- 레이아웃(Figma 1722-13489): 썸네일(56) + [제목 / **본문 미리보기** / 상대시각] + chevron.
- 변경: 부제 `answerCountLabel` → **본문 미리보기**. `MyQuestionListItemView`에 `contentPreview?`
  추가, 어댑터는 BE 필드 오면 매핑·없으면 undefined. 미리보기 없을 때 폴백: 해당 줄 생략(제목+시각만).
- i18n: `answerCountLabel` 사용처 제거(카탈로그 키는 다른 곳 참조 없으면 정리).

### ② 리스트 롱프레스 → 수정 / 삭제

- `LongPressActionOverlay` 적용. 활성 행 = 해당 질문 카드 클론(전체 제목 노출).
- 메뉴: **수정**(연필, 기본 tone) / **삭제**(빨강 휴지통, destructive).
- 삭제: 기존 `useDeleteQuestion` + `ConfirmDialog` 유지.
- 수정 → `CreateQuestionScreen`을 **edit 모드**로 오버레이 오픈.

### ③ 질문 수정 화면 — `create-question-screen`(edit 모드 확장)

- Props 확장: `mode: "create" | "edit"`, `questionId?`, 초기값. edit일 때 질문 상세를 fetch해
  title/content/이미지/장소 prefill.
- 장소: **수정 가능**(생성과 동일 `MeetupLocationPicker`). 단 BE `UpdateQuestionRequest`에 location
  없음 → 필드 추가를 BE 이슈로 요청. FE 타입/요청에는 location 포함해 계약우선.
- 제출: edit이면 `updateQuestion(questionId, ...)`(이미 존재하는 api 함수) 호출 → 성공 시 닫고
  상세/목록 쿼리 무효화. 헤더 타이틀 edit용 문구.
- 이미지 재업로드 규약: 기존 이미지 유지 + 신규 업로드 시 `imageFileIds` 갱신(생성 흐름과 동일).

### ④ 답변 리스트 (채택 → 채팅 토글) — `question-detail-screen` / `question-answer-author-item`

- 버튼 로직 교체(작성자 시점, 미채택/채택 per-answer):
  - 미채택 → **답변 채택**(outline) → `onAccept`
  - 채택됨 → **채팅 시작**(primary filled) → `onStartChat`
  - (본인 답변 `isMine` → 채팅 시작만; AI 답변은 `question-ai-answer-card` 유지)
- **여러 채택 허용**: `canAccept` 게이트에서 `!question.isResolved` 제거, `!a.isAccepted`만 사용.
  (BE가 첫 채택에 isResolved를 잠그면 다중 채택 허용을 BE 이슈에 명시.)
- 채택 성공 → 해당 답변 `isAccepted` 갱신(쿼리 무효화) → 버튼이 채팅 시작으로 전환.
- 채팅 시작 → `useCreateQuestionRoom`(`POST /chat/rooms/question`) → `router.push('/chats/{roomId}')`.
  BE 미구현 → 실패 시 `chatStartFailed` 토스트. BE 이슈 등록.
- 국기: `nationality` 오면 표시, 없으면 생략(#73).

### ⑤ 답변 롱프레스 → 신고 — `question-answer-author-item`(+overlay)

- 하단 "신고" 텍스트 링크 제거. 답변 카드에 `useLongPress` 부착 → `LongPressActionOverlay`로
  활성 답변 카드 부상 + 메뉴 **신고**(빨강).
- 신고 확정(`ConfirmDialog`) → `reportAnswer` → 성공 시 **그 답변을 목록에서 제거**
  (현재 `reportedIds` 블러 방식 대신 필터링 제거). BE 미구현 → 실패 토스트. BE 이슈(#69).

### ⑥ 채팅창 + 더보기 — `chat-room-page-content` / `chat-room-more-*`

- Figma 958-4520(채팅창) / 1722-13148(더보기: 프로필·"대화 상대 N"·멤버 국기·"채팅방 나가기")와
  기존 컴포넌트를 대조하여 헤더/버블/입력/더보기 정렬. BE 채팅 API 대부분 존재(문서 §9).
- 상세 diff는 구현 계획 단계에서 컴포넌트별로 산출(레이아웃·문구·국기·나가기 확인 다이얼로그).

## 데이터 / 계약 변경 요약

- `MyQuestionItem`(FE type)·`MyQuestionListItemView`: `contentPreview?: string` 추가.
- `UpdateQuestionRequest`: `location?: LocationSnapshot` 추가(계약우선).
- 기존 존재: `updateQuestion` api, `reportAnswer` api(#69 계약), `useCreateQuestionRoom`.

## i18n

- 신규/변경 라벨은 전부 `messages.question`(및 필요 시 `messages.chat`)에 추가. 하드코딩 금지.
- 후보 키: `editAction`(수정), `editTitle`(질문 수정), 리스트 미리보기 폴백 문구,
  다중 채택/채팅 시작 관련 기존 키 재사용(`acceptButton`, `startChatLabel`, `chatStartFailed`).
- 7개 카탈로그(ko/en/ja/zh/th/ru/vi) 동일 키 유지.

## 테스트 / 검증

- 동작 검증(verify 스킬): 리스트 롱프레스 수정→prefill 확인, 삭제, 답변 채택→버튼 토글,
  채팅 시작→라우팅(스텁 실패 토스트 확인), 답변 신고→행 제거, 채팅창/더보기 렌더.
- `pnpm build` 클린 후 develop으로 PR(로컬 merge 금지). 커밋마다 이슈 체크리스트 동기화.

## BE 이슈 등록 (ieum_BE, 파일링만 가능)

1. `PATCH /api/v1/questions/{id}` 질문 수정 + `UpdateQuestionRequest.location`
2. `MyQuestionItem.contentPreview` (리스트 본문 미리보기)
3. `POST /api/v1/answers/{id}/report` 답변 신고 (기존 #69 확인/보강)
4. `POST /api/v1/chat/rooms/question` 질문 채팅방 생성
5. `AuthorSummary.nationality` 답변 작성자 국적 (기존 #73 확인/보강)
6. 답변 다중 채택 허용(첫 채택에 질문 잠그지 않기) 확인

## 범위 밖 (YAGNI)

- 비슷한 질문 추천 API(별도), 알림/SSE, 관리자 신고 리뷰 파이프라인.
- 답변 수정/삭제(요구에 없음). 신고 사유 선택 UI(현재 `reason: "etc"` 고정 유지).
