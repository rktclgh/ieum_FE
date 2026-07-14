# 질문 내역 · 답변 보기 · 꼬리 질문 채팅 — 설계

> [!IMPORTANT]
> 이 문서는 #76 구현 당시 기록이다. #82 정적 export 전환 이후 현행 canonical URL은 `/questions/detail/?questionId={questionId}`와 `/chats/room/?chatId={chatId}`이며, 아래의 동적 path 표기는 역사적 설명으로만 읽는다. 현재 계약은 `docs/ROUTES.md`를 기준으로 한다.
>
> 생성: 2026-07-14
> 관련 Figma: node `1722-13490`, `1722-13489`(질문 내역) · `1744-10029`, `1744-10030`(답변 보기) · `958-4520`, `1722-13148`(꼬리 질문 채팅)
> 대상 저장소: ieum_FE (구현) · ieum_BE (엔드포인트 이슈 등록만)

## 목표

세 개의 화면을 구현하고, 기존에 연결된 API를 재사용하며, 누락된 백엔드 계약은 이슈로 등록한 뒤 FE에서 계약 우선(contract-first) 방식으로 미리 배선한다.

1. **질문 내역** `/questions` — 내 질문 목록, 롱프레스 삭제
2. **답변 보기** `/questions/[questionId]` — 내 질문의 작성자 뷰(채택·채팅 시작·신고)
3. **꼬리 질문 채팅** `/chats/[chatId]` — 답변자와의 1:1 채팅(chat 스택 재사용)

## 결정 사항 (브레인스토밍 확정)

| # | 결정 | 값 |
|---|---|---|
| 1 | BE 공백 처리 | **FE 전량 구현 + BE 이슈 등록.** 없는 API는 어댑터/스텁으로 우아하게 처리 |
| 2 | 답변 보기 구조 | 기존 `/questions/[questionId]` **같은 라우트 + 역할 분기**(useMe) |
| 3 | 질문 수정 | **구현하지 않음.** 롱프레스 메뉴는 삭제만 노출 |
| 4 | 누락 API 배선 | **계약 우선 스텁** — 제안 엔드포인트를 FE api 함수로 정의·연결, 미구현 시 토스트 |

## API 인벤토리

범례: ✅ FE 연결됨 · 🔧 BE 있음/FE 미연결 · ❌ BE 없음(이슈 등록)

### ① 질문 내역
| 기능 | 엔드포인트 | 상태 |
|---|---|---|
| 내 질문 목록 | `GET /api/v1/questions/me` (cursor) | 🔧 `useMyQuestions` 존재, 소비 화면 없음 |
| 질문 삭제 | `DELETE /api/v1/questions/{id}` | 🔧 BE 있음, FE 뮤테이션 신규 |
| 질문 수정 | — | ❌ 범위 제외 |

### ② 답변 보기
| 기능 | 엔드포인트 | 상태 |
|---|---|---|
| 질문+답변 상세 | `GET /api/v1/questions/{id}` | ✅ `useQuestionDetail` |
| AI답변 | `answers[].isAi=true` (서버 비동기 자동생성) | ✅ |
| 답변 채택 | `POST /api/v1/answers/{id}/accept` | ✅ `useAcceptAnswer` |
| 채팅 시작(방 생성) | `POST /api/v1/chat/rooms/question` (제안) | ❌ 이슈, 계약우선 스텁 |
| 답변 신고 | (제안) | ❌ 이슈, 계약우선 스텁 |
| 국적 뱃지 | `AuthorSummary.nationality` (제안) | ❌ 이슈 #73 병합, 어댑터 안전처리 |

### ③ 꼬리 질문 채팅
| 기능 | 엔드포인트 | 상태 |
|---|---|---|
| 메시지 목록 | `GET /api/v1/chat/rooms/{id}/messages` | ✅ `useChatMessages` |
| 실시간 송수신 | STOMP `/app/rooms/{id}/send` ↔ `/topic/rooms/{id}` | ✅ `useChatRoomSocket` |
| 방 상세·대화상대 | `GET /api/v1/chat/rooms/{id}` | ✅ `useChatRoom` |
| 채팅방 나가기 | `POST /api/v1/chat/rooms/{id}/leave` | ✅ `useLeaveRoom` |
| 방 제목=질문 제목 | 방 상세에 questionId만 존재 | ❌ FE에서 질문 조회로 보정 |
| 대화상대 국적 | `ChatRoomMemberResponse.nationality` (제안) | ❌ 이슈, 어댑터 안전처리 |

## 화면 설계

### ① 질문 내역 `/questions`
- 신규 라우트 `src/app/questions/page.tsx` → `features/question/components/questions-list-page-content.tsx`
- 기존 `useMyQuestions`(무한스크롤) 소비 + `MyQuestionItem → 뷰모델` 어댑터 신규(`question-adapter.ts`에 추가)
- 카드: 썸네일 · 제목 · 부제(본문 미리보기 필드 나오기 전엔 상대시간/답변 수) · 상대시간 · `>` 셰브런
- 롱프레스 → 컨텍스트 메뉴 **삭제만** (chat `use-long-press` + context-menu 패턴 재사용)
- 삭제 → 신규 `useDeleteQuestion`(`DELETE`, `questionKeys.myList()` 무효화, 낙관적 제거 후 실패 롤백)
- 카드 탭 → `router.push('/questions/{questionId}')`
- 빈 상태 / 로딩 스켈레톤 / 하단 탭바 유지
- i18n: `messages.question`에 `historyTitle`, `historyEmpty`, `deleteAction`, `deleteConfirm*` 등 신규

### ② 답변 보기 `/questions/[questionId]` (기존 `question-detail-screen.tsx` 확장)
- `useMe().userId === question.author.userId` 로 분기
  - **작성자 뷰**(d3/d4): 답변 입력창 숨김. 헤더(질문 제목) → AI답변 카드 → 답변 목록
  - **답변자 뷰**(기존): 답변 입력창 유지
- 답변 카드(작성자 뷰): 프로필(아바타·닉네임·국적뱃지*) · 본문 · 우측 액션
  - 미채택·타인 답변 → `답변 채택`(outline) + `채팅 시작`(filled)
  - 내 답변 → 흰 배경 강조, `개인 채팅`
  - 채택됨 → `채택 완료` 뱃지(비활성)
  - 신고된 답변 → 블러 + `신고` 표시
  - 케밥/신고 액션 → 신규 `useReportAnswer`(스텁)
- 채택 → 기존 `useAcceptAnswer`
- 채팅 시작 → 신규 `useCreateQuestionRoom(questionId, targetUserId)`(스텁) → 성공 시 `/chats/{roomId}`
- `*국적뱃지`: `AuthorSummary.nationality` 없을 때 어댑터가 `null` 처리 → 뱃지 미표시
- 신규 api 함수: `createQuestionRoom`, `reportAnswer` (BE 이슈 계약과 동일 시그니처)

### ③ 꼬리 질문 채팅 `/chats/[chatId]` (chat 스택 재사용)
- `roomType:"question"` 방은 `ChatRoomPageContent` + `useChatRoomSocket`가 이미 처리
- `resolveRoomTitle`: question 방일 때 `questionId`로 질문 제목 보정(가벼운 조회 또는 요약 캐시)
- d6 더보기 드로어: 대화상대(국적뱃지*) · `채팅방 나가기`(기존 `useLeaveRoom`) — 대부분 존재, 국적만 어댑터 안전처리
- 진입점 = ②의 `채팅 시작`

## 계약 우선 스텁 규약

BE 미구현 엔드포인트는 아래 시그니처로 FE api 함수를 먼저 정의하고 버튼을 연결한다. BE가 404/501을 반환하면 `getQuestionErrorMessage` 계열로 "곧 지원됩니다" 토스트를 띄운다. BE가 이슈대로 배포되면 FE 수정 없이 동작한다.

```
POST /api/v1/chat/rooms/question
  body: { questionId: number, targetUserId: number }
  res : { roomId, roomType: "question", questionId }   // 도메인 getOrCreateQuestionRoom 재사용

POST /api/v1/answers/{answerId}/report   (제안, 최종 경로는 BE 확정)
  body: { reason: ReportReason, detail?: string }
  res : { reportId }
```

## 등록한 BE 이슈 (ieum_BE, 이슈만 등록 — 푸시 권한 없음)

| 이슈 | 내용 | 상태 |
|---|---|---|
| **#68** | 🔑 답변→꼬리질문 1:1 채팅방 생성 REST 엔드포인트 (`getOrCreateQuestionRoom` 노출) | 신규 등록 |
| **#69** | 답변 신고 엔드포인트 (현재 chat message만 지원) | 신규 등록 |
| **#70** | `ChatRoomMemberResponse`에 국적 필드 (d6 대화상대) | 신규 등록 |
| #64 | 질문 작성자(`AuthorSummary`) 국적 + 질문 `createdAt` | 기존(진행 중) |

선택/후속(별도 이슈화 보류): `MyQuestionItem` 본문 미리보기 필드, 채팅방 상세에 질문 제목(FE 질문 조회로 보정).

## 스코프 제외 (YAGNI)

- 질문 수정(편집 화면·엔드포인트)
- 답변 수정/삭제
- 클라이언트 트리거 AI 답변 생성(서버 자동 생성 유지)
- `?status=answering|accepted` 필터 UI(디자인에 탭 없음 → 후속)

## 검증 관점

- 질문 내역: 목록 렌더·무한스크롤·삭제 낙관적 갱신·빈 상태
- 답변 보기: 작성자/답변자 분기·채택 반영·채팅 시작 스텁 토스트·신고 스텁·국적 미표시 안전
- 꼬리 채팅: 방 제목 보정·STOMP 송수신·나가기·국적 미표시 안전
- 공통: 하드코딩 한국어 없음(i18n 카탈로그), `pnpm build` 클린 후 푸시
