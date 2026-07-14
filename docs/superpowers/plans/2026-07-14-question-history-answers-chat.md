# 질문 내역 · 답변 보기 · 꼬리 질문 채팅 Implementation Plan

> [!IMPORTANT]
> 이 계획은 #76 구현 당시 기록이다. #82 정적 export 전환 이후 현행 canonical URL은 `/questions/detail/?questionId={questionId}`와 `/chats/room/?chatId={chatId}`이며, 아래의 동적 path 및 직접 `router.push` 예시는 실행 지침이 아니다. 현재 계약은 `docs/ROUTES.md`를 기준으로 한다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내 질문 목록(삭제 포함), 작성자용 답변 보기(채택·채팅시작·신고), 꼬리질문 1:1 채팅 3개 화면을 구현하고 기존 API를 재사용하며 누락 API는 계약우선 스텁으로 배선한다.

**Architecture:** 기존 `src/features/question`·`src/features/chat` 피처에 파일을 추가·수정한다. API는 `apiClient` 래핑 함수 → react-query 훅 → adapter(뷰모델) → presentation 컴포넌트 순서를 그대로 따른다. 답변 보기는 신규 라우트 없이 기존 `/questions/[questionId]` 화면에서 `useMe`로 작성자/답변자 뷰를 분기한다. 꼬리질문 채팅은 기존 `/chats/[chatId]` chat 스택(REST+STOMP)을 재사용한다.

**Tech Stack:** Next.js 16(App Router) · React 19 · TanStack Query v5 · axios(`apiClient`) · @stomp/stompjs · Tailwind v4 · @base-ui/react · zustand(i18n).

## Global Constraints

- 패키지 매니저는 **pnpm 전용** (`pnpm install`/`pnpm build`/`pnpm lint`). `npm` 금지.
- **테스트 러너 없음.** 각 태스크 검증 = `pnpm lint` 통과 + `pnpm build` 타입/빌드 클린 + 명시된 수동 확인. 커밋 전 `pnpm build`는 반드시 클린.
- 모든 폴더/파일은 **소문자 kebab-case**.
- 하드코딩 한국어 금지 — 모든 UI 문자열은 `src/lib/i18n/messages/*` 카탈로그(7개 언어: ko/en/ja/zh/vi/th/ru)에 추가. `Messages` 인터페이스가 누락 언어를 컴파일 에러로 잡는다.
- 커밋 메시지 트레일러(`Co-Authored-By`) 금지. 커밋 제목 형식: `feat: #76 ...` / `fix: #76 ...` (FE 이슈 #76, 브랜치 `feat/#76`).
- API 함수는 항상 `apiClient`(`@/lib/api/client`) 사용. 뷰모델 변환은 adapter에서, 컴포넌트는 뷰모델만 소비.
- 파일 URL은 `resolveFileUrl`(`@/lib/api/file-url`)로 정규화.
- 국적 필드는 백엔드 미구현(이슈 #64/#70)이므로 **null-safe**: 값이 없으면 국기/국적을 렌더하지 않는다(빌드/런타임 에러 없이 degrade).

## 파일 구조 (생성/수정)

**생성**
- `src/app/questions/page.tsx` — 질문 내역 라우트
- `src/features/question/components/questions-list-page-content.tsx` — 질문 내역 화면
- `src/features/question/components/question-history-item.tsx` — 질문 내역 카드
- `src/features/question/components/question-ai-answer-card.tsx` — AI답변 카드
- `src/features/question/components/question-answer-author-item.tsx` — 작성자 뷰 답변 카드(채택·채팅·신고)

**수정**
- `src/features/question/api/question-api.ts` — `deleteQuestion` 추가
- `src/features/question/api/question-types.ts` — 답변 뷰 국적 관련 없음(타입은 adapter에서); `nationality`는 이미 `QuestionAuthor`에 존재
- `src/features/question/hooks/use-question-mutations.ts` — `useDeleteQuestion`, `useCreateQuestionRoom`, `useReportAnswer`
- `src/features/question/lib/question-adapter.ts` — `adaptMyQuestionItem` + 뷰타입, `adaptAnswer` 국적 확장
- `src/features/question/components/question-detail-screen.tsx` — 작성자/답변자 역할 분기
- `src/features/chat/api/chat-api.ts` — `createQuestionRoom` 추가
- `src/features/chat/api/chat-types.ts` — `QuestionRoomRequest`; `ChatRoomMemberResponse.nationality?`
- `src/features/chat/lib/chat-adapter.ts` — `adaptMember` 국적 확장, `ChatMemberEntry` 확장
- `src/features/chat/components/chat-room-page-content.tsx` — 질문방 제목 보정 + 멤버 국기 전달
- `src/features/report/api/report-api.ts` + `report-types.ts` — `reportAnswer` 스텁
- `src/lib/i18n/messages/{ko,en,ja,zh,vi,th,ru}.ts` — 신규 문자열
- `docs/ROUTES.md` — 질문 내역/상세 라우트 확정 반영

---

## Task 1: 질문 삭제 API + 훅

**Files:**
- Modify: `src/features/question/api/question-api.ts`
- Modify: `src/features/question/hooks/use-question-mutations.ts`

**Interfaces:**
- Produces: `deleteQuestion(questionId: number): Promise<void>`; `useDeleteQuestion(): UseMutationResult<void, unknown, number>` (낙관적으로 `questionKeys.myList()` 무한쿼리 캐시에서 해당 항목 제거, 실패 시 롤백).

- [ ] **Step 1: `deleteQuestion` API 함수 추가**

`question-api.ts`의 `acceptAnswer` 다음에 추가하고 export 목록에 넣는다:

```ts
// 질문 삭제 — 204. 작성자만 가능. (BE: DELETE /api/v1/questions/{id})
async function deleteQuestion(questionId: number) {
  await apiClient.delete(`/api/v1/questions/${questionId}`)
}
```

export 블록에 `deleteQuestion` 추가:

```ts
export {
  getQuestion,
  getMyQuestions,
  createQuestion,
  updateQuestion,
  postAnswer,
  acceptAnswer,
  deleteQuestion,
}
```

- [ ] **Step 2: `useDeleteQuestion` 훅 추가**

`use-question-mutations.ts` 상단 import에 `deleteQuestion` 추가하고, `MyQuestionsPage` 타입을 import한다:

```ts
import {
  acceptAnswer,
  createQuestion,
  deleteQuestion,
  postAnswer,
  updateQuestion,
} from "@/features/question/api/question-api"
import type {
  CreateQuestionRequest,
  MyQuestionsPage,
  PostAnswerRequest,
  UpdateQuestionRequest,
} from "@/features/question/api/question-types"
import type { InfiniteData } from "@tanstack/react-query"
```

`useAcceptAnswer` 다음에 추가하고 export에 포함:

```ts
// 질문 삭제 — 무한쿼리 캐시에서 낙관적으로 제거하고 실패 시 롤백한다.
function useDeleteQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionId: number) => deleteQuestion(questionId),
    onMutate: async (questionId) => {
      await queryClient.cancelQueries({ queryKey: questionKeys.myList() })
      const previous = queryClient.getQueryData<InfiniteData<MyQuestionsPage>>(
        questionKeys.myList()
      )
      queryClient.setQueryData<InfiniteData<MyQuestionsPage>>(
        questionKeys.myList(),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((item) => item.questionId !== questionId),
                })),
              }
            : data
      )
      return { previous }
    },
    onError: (_error, _questionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(questionKeys.myList(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
    },
  })
}
```

export 블록에 `useDeleteQuestion` 추가.

- [ ] **Step 3: 검증**

Run: `pnpm lint && pnpm build`
Expected: 타입/린트 에러 없이 통과. (아직 소비처 없음 — 시그니처 컴파일만 확인.)

- [ ] **Step 4: 커밋**

```bash
git add src/features/question/api/question-api.ts src/features/question/hooks/use-question-mutations.ts
git commit -m "feat: #76 질문 삭제 API·낙관적 삭제 훅 추가"
```

---

## Task 2: 내 질문 목록 어댑터

**Files:**
- Modify: `src/features/question/lib/question-adapter.ts`

**Interfaces:**
- Consumes: `MyQuestionItem`(`question-types.ts`: `{ questionId, title, isResolved, thumbnailUrl, answerCount, createdAt }`).
- Produces: `MyQuestionListItemView { questionId, title, isResolved, thumbnailSrc?: string, answerCount, createdAt }`; `adaptMyQuestionItem(item: MyQuestionItem): MyQuestionListItemView`.

- [ ] **Step 1: 뷰타입 + 어댑터 추가**

`question-adapter.ts`에 import 추가(이미 `MyQuestionItem` 없으면):

```ts
import type {
  AnswerResponse,
  MyQuestionItem,
  QuestionDetailResponse,
} from "@/features/question/api/question-types"
```

`adaptQuestionSummary` 다음에 추가:

```ts
// 질문 내역 목록 카드용 뷰모델. 썸네일 URL은 same-origin 경로로 정규화.
// 부제(본문 미리보기) 필드는 BE MyQuestionItem에 없어 목록은 제목+답변수+시각만 노출한다.
interface MyQuestionListItemView {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailSrc?: string
  answerCount: number
  createdAt: string
}

function adaptMyQuestionItem(item: MyQuestionItem): MyQuestionListItemView {
  return {
    questionId: item.questionId,
    title: item.title,
    isResolved: item.isResolved,
    thumbnailSrc: resolveFileUrl(item.thumbnailUrl),
    answerCount: item.answerCount,
    createdAt: item.createdAt,
  }
}
```

export 블록 갱신:

```ts
export {
  adaptAnswer,
  adaptQuestionDetail,
  adaptQuestionSummary,
  adaptMyQuestionItem,
}
export type { QuestionAnswerView, QuestionDetailView, MyQuestionListItemView }
```

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/features/question/lib/question-adapter.ts
git commit -m "feat: #76 내 질문 목록 어댑터 추가"
```

---

## Task 3: 꼬리질문 채팅방 생성 API + 훅 (계약우선 스텁)

**Files:**
- Modify: `src/features/chat/api/chat-types.ts`
- Modify: `src/features/chat/api/chat-api.ts`
- Modify: `src/features/question/hooks/use-question-mutations.ts`

**Interfaces:**
- Produces: `createQuestionRoom(body: QuestionRoomRequest): Promise<ChatRoomResponse>` where `QuestionRoomRequest { questionId: number; targetUserId: number }`; `useCreateQuestionRoom(): UseMutationResult<ChatRoomResponse, unknown, QuestionRoomRequest>`. 성공 시 `ChatRoomResponse.roomId`로 `/chats/{roomId}` 이동은 호출 컴포넌트(Task 12)가 담당.
- BE 계약: `POST /api/v1/chat/rooms/question`(이슈 #68). 미구현 시 404 → 호출부에서 토스트.

- [ ] **Step 1: 요청 타입 추가**

`chat-types.ts`에 추가하고 export:

```ts
// 답변 보기 → 답변자와의 꼬리질문 1:1 방 생성 요청 (BE 이슈 #68).
interface QuestionRoomRequest {
  questionId: number
  targetUserId: number
}
```

export type 목록에 `QuestionRoomRequest` 추가.

- [ ] **Step 2: `createQuestionRoom` API 함수 추가**

`chat-api.ts` import에 `QuestionRoomRequest` 추가. `createDirectRoom` 다음에 추가하고 export:

```ts
// 답변자와의 꼬리질문 1:1 방 생성/조회(멱등). BE 이슈 #68 계약. (CSRF 필요)
async function createQuestionRoom(body: QuestionRoomRequest) {
  const { data } = await apiClient.post<ChatRoomResponse>(
    "/api/v1/chat/rooms/question",
    body
  )
  return data
}
```

- [ ] **Step 3: `useCreateQuestionRoom` 훅 추가**

`use-question-mutations.ts`에 import 추가:

```ts
import { createQuestionRoom } from "@/features/chat/api/chat-api"
import type { QuestionRoomRequest } from "@/features/chat/api/chat-types"
```

훅 추가 + export:

```ts
// 답변 보기의 "채팅 시작" — 방 생성 성공 시 채팅 목록 캐시를 갱신한다.
function useCreateQuestionRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: QuestionRoomRequest) => createQuestionRoom(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] })
    },
  })
}
```

> 참고: 채팅 쿼리키가 `chatKeys.rooms()` 형태면 그 팩토리를 import해 사용한다. `src/features/chat/hooks/use-chat-queries.ts`에서 `chatKeys` export를 확인하고 `["chat","rooms"]` 대신 `chatKeys.rooms()`로 교체.

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/chat/api/chat-types.ts src/features/chat/api/chat-api.ts src/features/question/hooks/use-question-mutations.ts
git commit -m "feat: #76 꼬리질문 채팅방 생성 API·훅 (계약우선, BE #68)"
```

---

## Task 4: 답변 신고 API + 훅 (계약우선 스텁)

**Files:**
- Modify: `src/features/report/api/report-types.ts`
- Modify: `src/features/report/api/report-api.ts`
- Modify: `src/features/question/hooks/use-question-mutations.ts`

**Interfaces:**
- Consumes: `ReportReason`(`report-types.ts`: `"spam"|"ad"|"abuse"|"obscene"|"harassment"|"etc"`).
- Produces: `reportAnswer(answerId: number, body: AnswerReportRequest): Promise<CreateReportResponse>` where `AnswerReportRequest { reason: ReportReason; detail?: string }`; `useReportAnswer(): UseMutationResult<CreateReportResponse, unknown, { answerId: number; reason: ReportReason; detail?: string }>`.
- BE 계약: `POST /api/v1/answers/{answerId}/report`(이슈 #69). 미구현 시 404 → 토스트.

- [ ] **Step 1: 요청 타입 추가**

`report-types.ts`에 추가하고 export:

```ts
// 답변 신고 (BE 이슈 #69). chat 메시지 신고와 달리 answerId로 대상 지정.
interface AnswerReportRequest {
  reason: ReportReason
  detail?: string
}
```

- [ ] **Step 2: `reportAnswer` API 함수 추가**

`report-api.ts`에 import·함수·export 추가:

```ts
import type {
  AnswerReportRequest,
  CreateReportRequest,
  CreateReportResponse,
} from "@/features/report/api/report-types"

// 답변 신고 — BE 이슈 #69 계약. (CSRF 필요)
async function reportAnswer(answerId: number, body: AnswerReportRequest) {
  const { data } = await apiClient.post<CreateReportResponse>(
    `/api/v1/answers/${answerId}/report`,
    body
  )
  return data
}

export { submitReport, reportAnswer }
```

- [ ] **Step 3: `useReportAnswer` 훅 추가**

`use-question-mutations.ts`에 import 추가:

```ts
import { reportAnswer } from "@/features/report/api/report-api"
import type { ReportReason } from "@/features/report/api/report-types"
```

훅 추가 + export:

```ts
// 답변 신고 — 성공 시 호출부가 해당 답변을 로컬 블러 처리한다(BE에 신고상태 필드 없음).
function useReportAnswer() {
  return useMutation({
    mutationFn: ({
      answerId,
      reason,
      detail,
    }: {
      answerId: number
      reason: ReportReason
      detail?: string
    }) => reportAnswer(answerId, { reason, detail }),
  })
}
```

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/features/report/api/report-types.ts src/features/report/api/report-api.ts src/features/question/hooks/use-question-mutations.ts
git commit -m "feat: #76 답변 신고 API·훅 (계약우선, BE #69)"
```

---

## Task 5: i18n 문자열 추가 (7개 카탈로그)

**Files:**
- Modify: `src/lib/i18n/messages/ko.ts` (인터페이스 + ko 값)
- Modify: `src/lib/i18n/messages/{en,ja,zh,vi,th,ru}.ts`

**Interfaces:**
- Produces: `messages.question`에 신규 키 — `historyTitle`, `historyEmpty`, `deleteAction`, `deleteConfirmTitle`, `deleteConfirmDescription`, `deleteConfirmCancel`, `deleteConfirmConfirm`, `startChatLabel`, `personalChatLabel`, `reportAction`, `reportSubmitted`, `reportConfirmTitle`, `reportConfirmDescription`, `chatStartFailed`, `answerCountLabel: (count: number) => string`. `errors`에 `ROOM_CREATE_FAILED`, `REPORT_FAILED` 추가.

- [ ] **Step 1: `ko.ts` `Messages` 인터페이스의 `question` 블록에 키 추가**

기존 `question` 인터페이스(`addImageLabel` 다음, `errors` 앞)에 추가:

```ts
    historyTitle: string
    historyEmpty: string
    deleteAction: string
    deleteConfirmTitle: string
    deleteConfirmDescription: string
    deleteConfirmCancel: string
    deleteConfirmConfirm: string
    startChatLabel: string
    personalChatLabel: string
    reportAction: string
    reportConfirmTitle: string
    reportConfirmDescription: string
    reportSubmitted: string
    chatStartFailed: string
    answerCountLabel: (count: number) => string
```

`errors` 객체 타입에 추가:

```ts
      ROOM_CREATE_FAILED: string
      REPORT_FAILED: string
```

- [ ] **Step 2: `ko.ts` `ko` 객체의 `question` 블록에 값 추가**

`addImageLabel` 다음에 추가:

```ts
    historyTitle: "질문 내역",
    historyEmpty: "아직 등록한 질문이 없어요.",
    deleteAction: "삭제",
    deleteConfirmTitle: "이 질문을 삭제할까요?",
    deleteConfirmDescription: "삭제하면 답변과 함께 사라지며 되돌릴 수 없어요.",
    deleteConfirmCancel: "취소",
    deleteConfirmConfirm: "삭제",
    startChatLabel: "채팅 시작",
    personalChatLabel: "개인 채팅",
    reportAction: "신고",
    reportConfirmTitle: "이 답변을 신고할까요?",
    reportConfirmDescription: "신고하면 검토 후 조치될 수 있어요.",
    reportSubmitted: "신고가 접수되었어요.",
    chatStartFailed: "채팅을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
    answerCountLabel: (count) => `답변 ${count}`,
```

`errors` 객체에 추가:

```ts
      ROOM_CREATE_FAILED: "채팅을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.",
      REPORT_FAILED: "신고에 실패했어요. 잠시 후 다시 시도해 주세요.",
```

- [ ] **Step 3: 나머지 6개 언어 파일에 동일 키 추가 (번역)**

`en.ts, ja.ts, zh.ts, vi.ts, th.ts, ru.ts`의 `question` 블록·`errors`에 같은 키를 각 언어로 추가한다. 예시(en):

```ts
    historyTitle: "My Questions",
    historyEmpty: "You haven't posted any questions yet.",
    deleteAction: "Delete",
    deleteConfirmTitle: "Delete this question?",
    deleteConfirmDescription: "It will be removed with its answers and can't be undone.",
    deleteConfirmCancel: "Cancel",
    deleteConfirmConfirm: "Delete",
    startChatLabel: "Start Chat",
    personalChatLabel: "Chat",
    reportAction: "Report",
    reportConfirmTitle: "Report this answer?",
    reportConfirmDescription: "Reported content will be reviewed.",
    reportSubmitted: "Your report has been submitted.",
    chatStartFailed: "Couldn't start the chat. Please try again later.",
    answerCountLabel: (count) => `${count} answers`,
```
`errors`: `ROOM_CREATE_FAILED`, `REPORT_FAILED`도 각 언어로. 나머지 언어(ja/zh/vi/th/ru)도 동일 키를 자연스러운 번역으로 채운다. 값이 확실치 않은 언어는 영어 문구를 임시로 넣되 키 자체는 반드시 존재해야 한다(누락 시 빌드 실패).

- [ ] **Step 4: 검증**

Run: `pnpm build`
Expected: 통과. (한 언어라도 키가 빠지면 `Messages` 타입 불일치로 컴파일 실패 — 전부 채워졌는지 검증됨.)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/i18n/messages
git commit -m "feat: #76 질문 내역/답변보기/신고 i18n 문자열 추가"
```

---

## Task 6: 질문 내역 카드 컴포넌트

**Files:**
- Create: `src/features/question/components/question-history-item.tsx`

**Interfaces:**
- Consumes: `MyQuestionListItemView`(Task 2), `useLongPress`(`@/features/chat/hooks/use-long-press`).
- Produces: `QuestionHistoryItem` — props `{ item: MyQuestionListItemView; onOpen: () => void; onLongPress: () => void }`. 썸네일·제목·답변수·상대시각·셰브런 렌더, 롱프레스 바인딩.

- [ ] **Step 1: 컴포넌트 작성**

`formatRelativeTime`(`@/features/question/lib/question-time`)와 `useTranslation`을 사용한다.

```tsx
"use client"

import { ChevronRight } from "lucide-react"

import { useLongPress } from "@/features/chat/hooks/use-long-press"
import type { MyQuestionListItemView } from "@/features/question/lib/question-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionHistoryItemProps {
  item: MyQuestionListItemView
  onOpen: () => void
  onLongPress: () => void
}

function QuestionHistoryItem({ item, onOpen, onLongPress }: QuestionHistoryItemProps) {
  const { messages } = useTranslation()
  const longPress = useLongPress({ onLongPress })

  return (
    <button
      type="button"
      onClick={onOpen}
      {...longPress}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0px_2px_12px_0px_rgba(0,0,0,0.05)]"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {item.thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailSrc} alt={messages.question.imageAlt} className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-title-semibold-16 text-gray-900">{item.title}</span>
        <span className="truncate text-body-regular-14 text-gray-500">
          {messages.question.answerCountLabel(item.answerCount)}
        </span>
        <span className="text-body-regular-13 text-gray-400">
          {formatRelativeTime(item.createdAt, messages)}
        </span>
      </div>
      <ChevronRight className="size-5 shrink-0 text-gray-300" />
    </button>
  )
}

export { QuestionHistoryItem }
```

> 확인: `formatRelativeTime` 시그니처가 `(iso: string, messages: Messages)` 인지 `lib/question-time.ts`에서 확인하고 인자 순서를 맞춘다. 다르면 그 시그니처를 따른다. `text-body-regular-13` 유틸이 없으면 `text-body-regular-14`로 대체.

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/features/question/components/question-history-item.tsx
git commit -m "feat: #76 질문 내역 카드 컴포넌트"
```

---

## Task 7: 질문 내역 화면 (목록·무한스크롤·롱프레스 삭제)

**Files:**
- Create: `src/features/question/components/questions-list-page-content.tsx`

**Interfaces:**
- Consumes: `useMyQuestions`(무한쿼리), `adaptMyQuestionItem`(Task 2), `useDeleteQuestion`(Task 1), `QuestionHistoryItem`(Task 6), `ChatContextMenu`/`ChatContextMenuItem`(`@/features/chat/components/chat-context-menu`), `ConfirmDialog`, `AppBar`.
- Produces: `QuestionsListPageContent`(props 없음). 탭바가 있는 `(main)` 화면.

- [ ] **Step 1: 화면 컴포넌트 작성**

동작: 목록 렌더 → 카드 탭 시 `/questions/{id}` 이동 → 롱프레스 시 컨텍스트 메뉴(**삭제만**) → 삭제 확인 다이얼로그 → `useDeleteQuestion`. 하단 무한스크롤은 "더 보기" IntersectionObserver 또는 스크롤 바닥 감지. 로딩/빈 상태 처리.

```tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { QuestionHistoryItem } from "@/features/question/components/question-history-item"
import { useDeleteQuestion } from "@/features/question/hooks/use-question-mutations"
import { useMyQuestions } from "@/features/question/hooks/use-question-queries"
import { adaptMyQuestionItem } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

function QuestionsListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const query = useMyQuestions()
  const deleteQuestion = useDeleteQuestion()

  const [menuFor, setMenuFor] = React.useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null)

  const items = React.useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []).map(adaptMyQuestionItem),
    [query.data]
  )

  // 무한스크롤 센티널
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || !query.hasNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !query.isFetchingNextPage) query.fetchNextPage()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [query])

  const menuItems: ChatContextMenuItem[] = [
    {
      icon: <Trash2 className="size-5 text-red" />,
      label: messages.question.deleteAction,
      tone: "destructive",
      onClick: () => {
        setPendingDeleteId(menuFor)
        setMenuFor(null)
      },
    },
  ]

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col bg-gray-50">
        <AppBar title={messages.question.historyTitle} leadingIcon={null} trailingIcon={null} />

        <div className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-24">
          {items.length === 0 && !query.isLoading ? (
            <p className="w-full pt-16 text-center text-body-regular-14 text-gray-400">
              {messages.question.historyEmpty}
            </p>
          ) : (
            items.map((item) => (
              <QuestionHistoryItem
                key={item.questionId}
                item={item}
                onOpen={() => router.push(`/questions/${item.questionId}`)}
                onLongPress={() => setMenuFor(item.questionId)}
              />
            ))
          )}
          <div ref={sentinelRef} className="h-4" />
        </div>
      </main>

      {menuFor != null && (
        <ChatContextMenu
          dimmed
          items={menuItems}
          onDismiss={() => setMenuFor(null)}
          className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title={messages.question.deleteConfirmTitle}
        description={messages.question.deleteConfirmDescription}
        cancelLabel={messages.question.deleteConfirmCancel}
        confirmLabel={messages.question.deleteConfirmConfirm}
        onConfirm={() => {
          if (pendingDeleteId != null) deleteQuestion.mutate(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </>
  )
}

export { QuestionsListPageContent }
```

> 확인: `AppBar`가 `leadingIcon={null}`로 뒤로가기 없는 상단바를 렌더하는지(질문 내역은 탭 최상위라 back 불필요). 컨텍스트 메뉴 위치는 롱프레스 지점 기준이 이상적이나, MVP는 화면 중앙 고정으로 시작하고 필요 시 좌표 계산으로 개선.

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/features/question/components/questions-list-page-content.tsx
git commit -m "feat: #76 질문 내역 화면(무한스크롤·롱프레스 삭제)"
```

---

## Task 8: 질문 내역 라우트 + 수동 검증

**Files:**
- Create: `src/app/questions/page.tsx`

**Interfaces:**
- Consumes: `QuestionsListPageContent`(Task 7).

- [ ] **Step 1: 라우트 파일 작성**

`src/app/chats/page.tsx` 패턴을 따른다:

```tsx
import { QuestionsListPageContent } from "@/features/question/components/questions-list-page-content"

export default function QuestionsPage() {
  return <QuestionsListPageContent />
}
```

> 확인: `(main)` 그룹 레이아웃이 탭바를 제공하는지. `src/app/chats/page.tsx`가 `(main)` 하위인지 확인하고 동일 위치 규칙을 따른다. 탭바 매핑상 질문내역 → `/questions`이므로 하단 탭 활성표시가 자동 반영되는지 확인.

- [ ] **Step 2: 빌드 + 수동 검증**

Run: `pnpm build`
그다음 `pnpm dev`로 다음을 확인(로그인 필요 화면):
1. `/questions` 진입 시 내 질문 목록 렌더(썸네일·제목·답변수·시각).
2. 카드 탭 → `/questions/{id}` 이동.
3. 카드 롱프레스 → 삭제 메뉴 → 확인 → 목록에서 즉시 사라짐(낙관적).
4. 질문이 없으면 빈 상태 문구.
5. 하단 탭바 "질문" 활성.

Expected: 위 5개 정상. 콘솔 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/questions/page.tsx
git commit -m "feat: #76 질문 내역 라우트(/questions) 추가"
```

---

## Task 9: 답변 뷰모델 국적 확장

**Files:**
- Modify: `src/features/question/lib/question-adapter.ts`

**Interfaces:**
- Produces: `QuestionAnswerView`에 `countryFlagSrc?: string`, `countryName?: string` 추가. `adaptAnswer`가 `flagFromIso2(answer.author.nationality)`로 채운다(없으면 undefined).

- [ ] **Step 1: `QuestionAnswerView`에 국적 필드 추가**

```ts
interface QuestionAnswerView {
  answerId: number
  isAi: boolean
  isAccepted: boolean
  authorUserId: number
  authorName: string
  authorAvatarUrl?: string
  countryFlagSrc?: string
  countryName?: string
  content: string
  createdAt: string
  imageUrls: string[]
}
```

- [ ] **Step 2: `adaptAnswer`에서 국적 채우기**

`adaptAnswer` 반환 객체에 추가(`flagFromIso2`는 이미 import됨):

```ts
    countryFlagSrc: flagFromIso2(answer.author.nationality),
    countryName: countryNameFromNationality(answer.author.nationality),
```

`countryNameFromNationality`는 기존 국적 표시 소스를 재사용한다. 구현 전 `rg "nationality" src/features/join src/features/my` 로 국가 표시명을 어떻게 얻는지(예: `messages.countries[code]` 또는 join의 `COUNTRIES` 맵) 확인하고 동일 소스로 헬퍼를 정의한다. 표시명 소스가 i18n `messages` 의존이면 어댑터가 아니라 컴포넌트(Task 10)에서 계산하고, 어댑터는 `nationality`(iso2 원문)만 넘긴다. **BE가 nationality를 안 주면 전부 undefined → 국기/국적 미표시(정상).**

- [ ] **Step 3: 검증 + 커밋**

Run: `pnpm lint && pnpm build` → 통과.

```bash
git add src/features/question/lib/question-adapter.ts
git commit -m "feat: #76 답변 뷰모델 국적(국기) 필드 추가"
```

---

## Task 10: 작성자 뷰 답변 카드 (채택·채팅시작·신고)

**Files:**
- Create: `src/features/question/components/question-answer-author-item.tsx`

**Interfaces:**
- Consumes: `QuestionAnswerView`(Task 9), `Button`, `CountryFlag`(`@/features/chat/components/country-flag`).
- Produces: `QuestionAnswerAuthorItem` — props `{ answer: QuestionAnswerView; isMine: boolean; isReported: boolean; canAccept: boolean; onAccept: () => void; onStartChat: () => void; onReport: () => void }`. d3/d4의 프로필(국기)·본문·우측 액션(채택/채팅시작/개인채팅)·신고·블러를 렌더.

- [ ] **Step 1: 컴포넌트 작성**

규칙:
- 내 답변(`isMine`) → 흰 배경 강조 + `개인 채팅`(`personalChatLabel`, `variant="primary"`).
- 타인·미채택(`canAccept`) → `채택`(`variant="outline"`) + `채팅 시작`(`startChatLabel`, `variant="primary"`).
- `isAccepted` → `채택됨` 뱃지, 채택 버튼 숨김.
- `isReported` → 카드 본문 블러(`blur-sm select-none`) + `신고` 표시.

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/features/chat/components/country-flag"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAnswerAuthorItemProps {
  answer: QuestionAnswerView
  isMine: boolean
  isReported: boolean
  canAccept: boolean
  onAccept: () => void
  onStartChat: () => void
  onReport: () => void
}

function QuestionAnswerAuthorItem({
  answer,
  isMine,
  isReported,
  canAccept,
  onAccept,
  onStartChat,
  onReport,
}: QuestionAnswerAuthorItemProps) {
  const { messages } = useTranslation()

  return (
    <div className={isMine ? "flex w-full flex-col gap-2 rounded-2xl bg-white p-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.05)]" : "flex w-full flex-col gap-2 rounded-2xl bg-gray-50 p-4"}>
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="size-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {answer.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={answer.authorAvatarUrl} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-title-semibold-16 text-gray-900">{answer.authorName}</span>
            {answer.countryFlagSrc ? (
              <CountryFlag flagSrc={answer.countryFlagSrc} country={answer.countryName ?? ""} />
            ) : null}
          </div>
        </div>

        {isReported ? (
          <span className="shrink-0 text-body-medium-14 text-red">{messages.question.reportAction}</span>
        ) : answer.isAccepted ? (
          <span className="shrink-0 rounded-full bg-primary-600 px-2.5 py-1 text-body-medium-14 text-white">
            {messages.question.acceptedBadge}
          </span>
        ) : isMine ? (
          <Button variant="primary" size="sm" onClick={onStartChat}>
            {messages.question.personalChatLabel}
          </Button>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {canAccept ? (
              <Button variant="outline" size="sm" onClick={onAccept}>
                {messages.question.acceptButton}
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={onStartChat}>
              {messages.question.startChatLabel}
            </Button>
          </div>
        )}
      </div>

      {answer.content ? (
        <p className={isReported ? "select-none text-body-regular-14 text-gray-700 blur-sm" : "whitespace-pre-line text-body-regular-14 text-gray-700"}>
          {answer.content}
        </p>
      ) : null}

      {!isMine && !isReported ? (
        <button type="button" onClick={onReport} className="self-end text-body-regular-13 text-gray-400">
          {messages.question.reportAction}
        </button>
      ) : null}
    </div>
  )
}

export { QuestionAnswerAuthorItem }
```

> 국적 표시명(`countryName`)이 Task 9에서 어댑터로 못 채워지면(컴포넌트 i18n 의존), 여기서 `answer` 원문 nationality를 받아 `messages.countries[...]`로 계산하도록 props를 조정한다. 없으면 `country=""`로 국기만.

- [ ] **Step 2: 검증 + 커밋**

Run: `pnpm lint && pnpm build` → 통과.

```bash
git add src/features/question/components/question-answer-author-item.tsx
git commit -m "feat: #76 작성자 뷰 답변 카드(채택·채팅시작·신고)"
```

---

## Task 11: AI답변 카드 컴포넌트

**Files:**
- Create: `src/features/question/components/question-ai-answer-card.tsx`

**Interfaces:**
- Consumes: `QuestionAnswerView`.
- Produces: `QuestionAiAnswerCard` — props `{ answer: QuestionAnswerView }`. d3/d4 상단의 "✓ AI답변" 카드(체크 아이콘 + 라벨 + 본문).

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client"

import { CircleCheck } from "lucide-react"

import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAiAnswerCardProps {
  answer: QuestionAnswerView
}

function QuestionAiAnswerCard({ answer }: QuestionAiAnswerCardProps) {
  const { messages } = useTranslation()
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 p-4">
      <div className="flex items-center gap-1.5">
        <CircleCheck className="size-5 text-primary-600" />
        <span className="text-title-semibold-16 text-gray-900">{messages.question.aiBadge}답변</span>
      </div>
      <p className="whitespace-pre-line text-body-regular-14 text-gray-700">{answer.content}</p>
    </div>
  )
}

export { QuestionAiAnswerCard }
```

> "AI답변" 라벨은 `messages.question.aiBadge`("AI") + "답변" 조합이 하드코딩 한국어가 되므로, Task 5에서 `aiAnswerTitle: "AI답변"` 키를 추가해 사용하는 편이 안전하다. 그럴 경우 Task 5 인터페이스/값/7개 언어에 `aiAnswerTitle`을 함께 넣고 여기서 `messages.question.aiAnswerTitle`을 쓴다.

- [ ] **Step 2: 검증 + 커밋**

Run: `pnpm lint && pnpm build` → 통과.

```bash
git add src/features/question/components/question-ai-answer-card.tsx
git commit -m "feat: #76 AI답변 카드 컴포넌트"
```

---

## Task 12: 질문 상세 화면 역할 분기(작성자 뷰) + 액션 배선

**Files:**
- Modify: `src/features/question/components/question-detail-screen.tsx`

**Interfaces:**
- Consumes: `useMe`(`@/features/session/...` — 기존 사용처 확인), `useCreateQuestionRoom`/`useReportAnswer`/`useAcceptAnswer`(Tasks 1·3·4), `QuestionAnswerAuthorItem`(Task 10), `QuestionAiAnswerCard`(Task 11).
- 동작: `me.userId === question.authorUserId` → 작성자 뷰(AI카드 + 작성자 답변카드들, 답변 입력창 숨김). 아니면 기존 답변자 뷰 유지.

- [ ] **Step 1: `useMe` + 신규 훅 배선**

상단에 import·훅 추가:

```ts
import { useMe } from "@/features/session/hooks/use-me" // 실제 경로는 rg "useMe" 로 확인
import {
  useAcceptAnswer,
  useCreateQuestionRoom,
  usePostAnswer,
  useReportAnswer,
} from "@/features/question/hooks/use-question-mutations"
import { QuestionAnswerAuthorItem } from "@/features/question/components/question-answer-author-item"
import { QuestionAiAnswerCard } from "@/features/question/components/question-ai-answer-card"
```

컴포넌트 본문에:

```ts
  const me = useMe()
  const createRoom = useCreateQuestionRoom()
  const reportAnswer = useReportAnswer()
  const [reportedIds, setReportedIds] = React.useState<Set<number>>(new Set())
  const [pendingReportId, setPendingReportId] = React.useState<number | null>(null)

  const isAuthor = question != null && me.data?.userId === question.authorUserId

  const handleStartChat = (targetUserId: number) => {
    if (!question) return
    createRoom.mutate(
      { questionId: question.questionId, targetUserId },
      {
        onSuccess: (room) => router.push(`/chats/${room.roomId}`),
        onError: () => setActionError(messages.question.chatStartFailed),
      }
    )
  }

  const handleConfirmReport = () => {
    if (pendingReportId == null) return
    const answerId = pendingReportId
    reportAnswer.mutate(
      { answerId, reason: "etc" },
      {
        onSuccess: () => {
          setReportedIds((prev) => new Set(prev).add(answerId))
          setActionError(messages.question.reportSubmitted)
        },
        onError: () => setActionError(messages.question.errors.REPORT_FAILED),
      }
    )
    setPendingReportId(null)
  }
```

> `useMe` 반환 형태(`me.data?.userId` vs `me.userId`)는 기존 `question-detail-container.tsx`/시트가 쓰는 방식과 반드시 일치시킨다(그쪽이 `useMe().userId`를 쓰면 그대로). `reason: "etc"`는 MVP 기본값 — 신고 사유 선택 UI는 후속.

- [ ] **Step 2: 작성자 뷰 렌더 분기**

답변 목록 렌더 부분(`question.answers.map(...)`)을 `isAuthor` 분기로 감싼다. 작성자면 AI답변을 카드로 분리하고 나머지는 작성자 카드로 렌더:

```tsx
{isAuthor ? (
  <div className="flex w-full flex-col gap-3">
    {question.answers.filter((a) => a.isAi).map((a) => (
      <QuestionAiAnswerCard key={a.answerId} answer={a} />
    ))}
    {question.answers.filter((a) => !a.isAi).map((a) => (
      <QuestionAnswerAuthorItem
        key={a.answerId}
        answer={a}
        isMine={a.authorUserId === me.data?.userId}
        isReported={reportedIds.has(a.answerId)}
        canAccept={!question.isResolved && !a.isAccepted}
        onAccept={() => setPendingAcceptId(a.answerId)}
        onStartChat={() => handleStartChat(a.authorUserId)}
        onReport={() => setPendingReportId(a.answerId)}
      />
    ))}
    {question.answers.length === 0 ? (
      <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
        {messages.question.emptyAnswers}
      </p>
    ) : null}
  </div>
) : (
  question.answers.map((answer) => (
    <QuestionAnswerItem
      key={answer.answerId}
      answer={answer}
      canAccept={!question.isResolved && !answer.isAccepted}
      onAccept={() => setPendingAcceptId(answer.answerId)}
    />
  ))
)}
```

- [ ] **Step 3: 작성자 뷰에서 답변 입력창 숨김**

하단 입력창 블록 조건 `{question ? (`를 `{question && !isAuthor ? (`로 바꾼다(작성자는 답변 입력 불가, 디자인 d3/d4엔 입력창 없음).

- [ ] **Step 4: 신고 확인 다이얼로그 추가**

기존 채택 `ConfirmDialog` 아래에 추가:

```tsx
<ConfirmDialog
  open={pendingReportId != null}
  onOpenChange={(open) => !open && setPendingReportId(null)}
  title={messages.question.reportConfirmTitle}
  description={messages.question.reportConfirmDescription}
  cancelLabel={messages.question.acceptConfirmCancel}
  confirmLabel={messages.question.reportAction}
  onConfirm={handleConfirmReport}
/>
```

- [ ] **Step 5: 빌드 + 수동 검증**

Run: `pnpm lint && pnpm build`
`pnpm dev`로 확인:
1. 내가 작성한 질문 상세 → AI답변 카드 + 작성자 답변카드(채택/채팅시작 버튼), 하단 입력창 없음.
2. 타인 질문 상세 → 기존 답변자 뷰(입력창) 유지.
3. `채택` → 확인 → 채택됨 반영.
4. `채팅 시작` → (BE #68 미구현) → "채팅을 시작할 수 없어요" 토스트. (구현되면 `/chats/{roomId}` 이동.)
5. `신고` → 확인 → 접수 토스트 + 해당 답변 블러.

Expected: 위 정상. 국적 뱃지는 BE 미구현이라 미표시(정상).

- [ ] **Step 6: 커밋**

```bash
git add src/features/question/components/question-detail-screen.tsx
git commit -m "feat: #76 답변 보기 작성자 뷰 분기·채팅시작·신고 배선"
```

---

## Task 13: 꼬리질문 채팅방 제목 보정

**Files:**
- Modify: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Consumes: `useQuestionSummary`(`@/features/question/hooks/use-question-queries`) 또는 `useQuestionDetail`. `room.questionId`로 질문 제목을 가져와 제목으로 사용.

- [ ] **Step 1: 질문 제목 조회 + 제목 결정**

`room` 로드 뒤에 추가(질문방일 때만 enabled):

```ts
const questionId = room?.roomType === "question" ? room.questionId ?? undefined : undefined
const questionSummary = useQuestionSummary(questionId ?? 0, questionId != null)
const roomTitle = room
  ? room.roomType === "question" && questionSummary.data?.title
    ? questionSummary.data.title
    : resolveRoomTitle(room.members, myUserId, room.roomType)
  : ""
```

import 추가: `import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"`.

> `useQuestionSummary`는 `QuestionSummary`(`.title` 포함)를 반환한다(어댑터 확인함). 질문방이 아니면 `enabled=false`라 네트워크 호출 없음.

- [ ] **Step 2: 빌드 + 수동 검증**

Run: `pnpm lint && pnpm build`
`pnpm dev`로 질문방(roomType question) 진입 시 상단바·프로필 제목이 **질문 제목**으로 표시되는지 확인. 그룹/다이렉트방 제목은 기존대로.

- [ ] **Step 3: 커밋**

```bash
git add src/features/chat/components/chat-room-page-content.tsx
git commit -m "feat: #76 꼬리질문 채팅방 제목을 질문 제목으로 보정"
```

---

## Task 14: 채팅방 멤버 국적(국기) 배선

**Files:**
- Modify: `src/features/chat/api/chat-types.ts`
- Modify: `src/features/chat/lib/chat-adapter.ts`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Produces: `ChatRoomMemberResponse.nationality?: string | null`; `ChatMemberEntry`에 `countryFlagSrc?`, `countryName?`; `adaptMember`가 `flagFromIso2(member.nationality)`로 채움. 멤버 렌더 시 `flagSrc`/`nation` 전달.
- BE 계약: 이슈 #70. 미구현 시 `nationality` undefined → 국기 미표시.

- [ ] **Step 1: DTO에 nationality 추가**

`chat-types.ts`:

```ts
interface ChatRoomMemberResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  // 국적(ISO 3166-1 alpha-2). BE 이슈 #70 전까지 없을 수 있음.
  nationality?: string | null
}
```

- [ ] **Step 2: `adaptMember` + `ChatMemberEntry` 확장**

`chat-adapter.ts`에 `flagFromIso2` import 추가(`@/features/join/lib/nationality-map`). `ChatMemberEntry`에 `countryFlagSrc?: string; countryName?: string` 추가. `adaptMember`:

```ts
function adaptMember(member: ChatRoomMemberResponse, myUserId: number): ChatMemberEntry {
  return {
    userId: member.userId,
    name: member.nickname,
    avatarSrc: resolveFileUrl(member.profileImageUrl),
    isMe: member.userId === myUserId,
    countryFlagSrc: flagFromIso2(member.nationality),
    countryName: countryNameFromNationality(member.nationality),
  }
}
```

`countryNameFromNationality`는 Task 9와 동일 소스를 재사용(표시명 소스 확정 후). i18n 의존이면 컴포넌트에서 계산.

- [ ] **Step 3: 멤버 렌더에 flag 전달**

`chat-room-page-content.tsx`의 멤버 map에 prop 추가:

```tsx
{roomMembers.map((member) => (
  <ChatRoomMemberItem
    key={member.userId}
    name={member.name}
    avatarSrc={member.avatarSrc}
    isMe={member.isMe}
    flagSrc={member.countryFlagSrc}
    nation={member.countryName}
  />
))}
```

- [ ] **Step 4: 검증 + 커밋**

Run: `pnpm lint && pnpm build` → 통과. (BE #70 전까진 국기 미표시가 정상.)

```bash
git add src/features/chat/api/chat-types.ts src/features/chat/lib/chat-adapter.ts src/features/chat/components/chat-room-page-content.tsx
git commit -m "feat: #76 채팅방 멤버 국적(국기) 배선 (BE #70)"
```

---

## Task 15: ROUTES.md 갱신 + 최종 검증

**Files:**
- Modify: `docs/ROUTES.md`

- [ ] **Step 1: 라우트 문서 갱신**

- `(main) — 모임 & 질문` 표의 `/questions` 행 유지, 백엔드 API를 실제값 `GET /api/v1/questions/me`로 정정.
- 하위 화면 표의 "질문 상세 · 답변 목록 · 답변 채택" 행을 [라우트 목록]으로 이동: `/questions/[questionId]`, 백엔드 `GET /questions/{id}`, `POST /questions/{id}/answer`, `POST /answers/{id}/accept`, (+ 신규 `POST /chat/rooms/question`, `POST /answers/{id}/report` — BE 이슈 #68/#69).
- `/chats/[chatId]` 행 주석에 "질문방 제목=질문 제목, 멤버 국적(#70)" 메모 추가.
- 최종 수정일 `2026-07-14`로 갱신.

- [ ] **Step 2: 전체 빌드/린트 클린 확인**

Run: `pnpm lint && pnpm build`
Expected: 에러/경고 없이 클린.

- [ ] **Step 3: 전체 플로우 수동 검증**

`pnpm dev`:
1. `/questions` 목록 → 삭제 → 카드 탭 이동.
2. 내 질문 상세 → 작성자 뷰(채택/채팅시작/신고) → 채팅 시작 토스트/이동.
3. 질문방(`/chats/[chatId]`) → 제목=질문 제목, 드로어 대화상대·나가기.
- 하드코딩 한국어가 없는지(모두 `messages.*`) 최종 확인.

- [ ] **Step 4: 커밋**

```bash
git add docs/ROUTES.md
git commit -m "docs: #76 질문 상세/답변보기/꼬리채팅 라우트 확정 반영"
```

---

## Self-Review 결과

- **스펙 커버리지:** 질문 내역(Task 1·2·6·7·8) / 답변 보기 작성자뷰(Task 9·10·11·12) / 꼬리채팅(Task 13·14) / 스텁 3종(Task 3·4 + 12·13·14 배선) / i18n(Task 5) / 문서(Task 15). 스펙의 5개 BE 공백 모두 계약우선 스텁 또는 degrade로 대응. 질문 수정은 스코프 제외(스펙과 일치).
- **플레이스홀더:** 각 코드 스텝에 실제 코드 포함. "확인" 주석은 실제 존재하는 심볼(경로 확정 필요분)에 한해 `rg`로 검증하는 구체 지시 — 임의 값 채우기 아님.
- **타입 일관성:** `MyQuestionListItemView`, `QuestionAnswerView`(국적 필드), `QuestionRoomRequest`, `AnswerReportRequest`, `ChatMemberEntry`(국적 필드) 명칭이 정의 태스크와 소비 태스크에서 일치.
- **알려진 미확정(구현 중 `rg`로 확정):** `useMe` 정확 경로/반환형, `chatKeys` 팩토리, `formatRelativeTime` 시그니처, 국가 표시명 소스(`messages.countries` 또는 join `COUNTRIES`), `text-body-regular-13` 유틸 존재 여부. 각 태스크에 확인 지시 포함.
