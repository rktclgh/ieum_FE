# 질문 페이지 전면 리팩토링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma 기준으로 질문 도메인 6개 화면을 정렬하고, 롱프레스를 재사용 프리미티브로 통일하며, 답변 채택을 "채택→채팅 시작→채팅방 진입" per-answer 토글로 바꾼다.

**Architecture:** `src/features/question` 중심 리팩토링 + `src/features/chat` 채팅방 화면 정렬. 롱프레스는 신규 `LongPressActionOverlay`(활성 행 부상 + dim + 앵커 메뉴)로 통일. BE 미구현 엔드포인트는 계약우선 스텁 + ieum_BE 이슈 등록으로 처리.

**Tech Stack:** Next.js(App Router) + React 19 + TanStack Query + Tailwind + i18n(hand-rolled catalogs). 패키지 매니저 **pnpm**. 테스트 러너 없음 → 검증은 `pnpm build`(타입체크) + `pnpm lint` + 실제 앱 구동(verify/run 스킬).

## Global Constraints

- 폴더/파일: 전부 lowercase kebab-case. 새 컴포넌트는 `src/features/<domain>/components`.
- `components/ui`는 stateless-only. 상태/도메인 컴포넌트는 `features/*`.
- 하드코딩 한국어 금지 — 모든 UI 문자열은 7개 카탈로그(ko/en/ja/zh/th/ru/vi) `messages.*`에 추가.
- 커밋 메시지 접두: `#92`. **Co-Authored-By 트레일러 절대 금지.**
- 커밋마다 이슈 #92 체크리스트 동기화, 문서화 안 된 작업은 이슈 본문에 추가.
- 작업 위치: 워크트리 `/Users/jihye/ieum_FE/.claude/worktrees/feat-92` (브랜치 `feat/#92`).
- push 전 `pnpm build` 클린 필수. develop으로는 **PR로만** 통합(로컬 merge·직접 push 금지).
- 검색 입력 IME 가드 추가 금지(해당 없음, 참고).

---

## File Structure

**신규:**
- `src/features/question/components/long-press-action-overlay.tsx` — 롱프레스 공용 오버레이(활성 행 부상 + dim + 앵커 메뉴).

**수정:**
- `src/features/question/api/question-types.ts` — `MyQuestionItem.contentPreview?`, `UpdateQuestionRequest.location?` 추가.
- `src/features/question/lib/question-adapter.ts` — `MyQuestionListItemView.contentPreview?` 매핑.
- `src/features/question/components/question-history-item.tsx` — 부제를 본문 미리보기로.
- `src/features/question/components/questions-list-page-content.tsx` — 롱프레스 수정/삭제 오버레이 + 수정 화면 오픈.
- `src/features/question/components/create-question-screen.tsx` — edit 모드 확장.
- `src/features/question/components/question-answer-author-item.tsx` — 채택→채팅 토글 + 롱프레스 신고.
- `src/features/question/components/question-detail-screen.tsx` — 다중 채택 게이트 + 신고 제거 + 오버레이 연결.
- `src/lib/i18n/messages/{ko,en,ja,zh,th,ru,vi}.ts` — 신규 키(`editAction`, `editTitle`, `listPreviewEmpty` 등) + 타입.
- `src/features/chat/components/chat-room-page-content.tsx` (및 `chat-room-more-*`, `chat-bubble`, `chat-message-input`) — Figma 대조 정렬.

**타입 흐름:** `contentPreview?: string`, `location?: LocationSnapshot`, `LongPressActionOverlay` props는 Task 2에서 정의하며 이후 태스크가 소비한다.

---

## Task 1: 계약 스텁 + BE 이슈 등록

**Files:**
- Modify: `src/features/question/api/question-types.ts`
- (외부) ieum_BE 이슈 6건 등록

**Interfaces:**
- Produces: `MyQuestionItem.contentPreview?: string | null`, `UpdateQuestionRequest.location?: LocationSnapshot`.

- [ ] **Step 1: 타입에 계약 필드 추가**

`question-types.ts`의 `MyQuestionItem`에 필드 추가(주석으로 계약우선 표기):
```ts
interface MyQuestionItem {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailUrl: string | null
  answerCount: number
  createdAt: string
  // 리스트 본문 미리보기. BE 미구현(계약우선) — 오면 표시, 없으면 생략. #92
  contentPreview?: string | null
}
```
`UpdateQuestionRequest`에 location 추가:
```ts
interface UpdateQuestionRequest {
  title?: string
  content?: string
  imageFileIds?: number[]
  // 장소 수정. BE UpdateQuestionRequest에 필드 없음(계약우선). #92
  location?: LocationSnapshot
}
```

- [ ] **Step 2: 타입체크**

Run: `pnpm build`
Expected: 통과(기존 사용처 영향 없음 — 신규 옵셔널 필드).

- [ ] **Step 3: BE 이슈 6건 등록**

`gh issue create --repo rktclgh/ieum_BE` 로 아래 6건(각각 별도 이슈). 제목/본문 예:
1. `[feat] PATCH /api/v1/questions/{id} 질문 수정 + UpdateQuestionRequest.location 추가` — FE #92 의존.
2. `[feat] MyQuestionItem.contentPreview (질문 리스트 본문 미리보기 필드)` — GET /questions/me.
3. `[feat] POST /api/v1/answers/{id}/report 답변 신고` — 기존 #69 확인/보강.
4. `[feat] POST /api/v1/chat/rooms/question 질문 채팅방 생성` — 채택 답변 작성자와 방 생성.
5. `[feat] AuthorSummary.nationality 답변 작성자 국적` — 기존 #73 확인/보강.
6. `[feat] 답변 다중 채택 허용 (첫 채택에 질문 잠그지 않기)` — FE #92 다중 채택 정책.
> ieum_BE는 push 403 — 이슈 등록만. 등록 후 번호를 이 플랜과 이슈 #92 본문에 링크.

- [ ] **Step 4: 커밋**
```bash
git add src/features/question/api/question-types.ts docs/superpowers/plans/2026-07-14-question-pages-refactor.md
git commit -m "chore: #92 질문 리팩토링 계약 스텁(타입) + 구현 계획"
```

---

## Task 2: LongPressActionOverlay 프리미티브

Figma의 "눌린 행이 흰 카드로 부상(위아래 padding 10px, 폭 375→343) + 배경 dim + 앵커 메뉴". 리스트/답변 롱프레스 공용.

**Files:**
- Create: `src/features/question/components/long-press-action-overlay.tsx`

**Interfaces:**
- Produces:
```ts
interface LongPressAction {
  icon: React.ReactNode
  label: string
  tone?: "default" | "destructive"
  onClick: () => void
}
interface LongPressActionOverlayProps {
  anchorRect: DOMRect            // 눌린 행의 화면상 사각형
  children: React.ReactNode      // 부상시킬 활성 행(클론이 아닌 실제 노드)
  actions: LongPressAction[]
  onDismiss: () => void
}
function LongPressActionOverlay(props: LongPressActionOverlayProps): JSX.Element
```

- [ ] **Step 1: 컴포넌트 작성**

`long-press-action-overlay.tsx`:
```tsx
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface LongPressAction {
  icon: React.ReactNode
  label: string
  tone?: "default" | "destructive"
  onClick: () => void
}

interface LongPressActionOverlayProps {
  /** 눌린 행의 화면 좌표(getBoundingClientRect 결과) */
  anchorRect: DOMRect
  /** 부상시켜 보여줄 활성 행 콘텐츠 */
  children: React.ReactNode
  actions: LongPressAction[]
  onDismiss: () => void
}

// 활성 행 부상 폭: 디자인상 375 → 343 (좌우 16 거터). 위아래 여백 10px.
const ACTIVE_ROW_MAX_WIDTH = 343
const MENU_GAP = 8

function LongPressActionOverlay({
  anchorRect,
  children,
  actions,
  onDismiss,
}: LongPressActionOverlayProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onDismiss])

  // 활성 행: 원래 세로 위치(top)에 고정, 가로는 화면 중앙 정렬(max 343).
  const rowTop = Math.max(anchorRect.top - 10, 12)
  // 메뉴: 활성 행 아래에 앵커. 좌측 정렬은 활성 행 좌측과 맞춤.
  const menuTop = rowTop + anchorRect.height + 20 + MENU_GAP

  return (
    <div className="fixed inset-0 z-[60]">
      {/* dim 배경 — 클릭 시 닫힘 */}
      <div
        className="absolute inset-0 bg-black/30"
        role="presentation"
        aria-hidden
        onClick={onDismiss}
      />

      {/* 부상한 활성 행 (탭하면 닫힘) */}
      <div
        className="absolute left-1/2 w-full -translate-x-1/2 px-4"
        style={{ top: rowTop, maxWidth: ACTIVE_ROW_MAX_WIDTH + 32 }}
        onClick={onDismiss}
      >
        <div className="rounded-2xl bg-white py-2.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.16)]">
          {children}
        </div>
      </div>

      {/* 앵커된 액션 메뉴 */}
      <div
        role="menu"
        className="absolute left-1/2 -translate-x-1/2 px-4"
        style={{ top: menuTop, maxWidth: ACTIVE_ROW_MAX_WIDTH + 32 }}
      >
        <div className="w-[193px] rounded-3xl bg-white/90 px-6 py-2 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                action.onClick()
                onDismiss()
              }}
              className="flex w-full items-center gap-2 py-2.5 text-left"
            >
              {action.icon}
              <span
                className={cn(
                  "text-body-medium-15",
                  action.tone === "destructive" ? "text-red" : "text-gray-900"
                )}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { LongPressActionOverlay }
export type { LongPressAction, LongPressActionOverlayProps }
```

- [ ] **Step 2: 타입체크**

Run: `pnpm build`
Expected: 통과(아직 미사용이라 tree-shaking; 최소한 컴파일 성공).

- [ ] **Step 3: 커밋**
```bash
git add src/features/question/components/long-press-action-overlay.tsx
git commit -m "feat: #92 롱프레스 활성행 부상 오버레이 프리미티브 추가"
```

---

## Task 3: ① 질문 리스트 본문 미리보기

**Files:**
- Modify: `src/features/question/lib/question-adapter.ts`
- Modify: `src/features/question/components/question-history-item.tsx`

**Interfaces:**
- Consumes: `MyQuestionItem.contentPreview?` (Task 1).
- Produces: `MyQuestionListItemView.contentPreview?: string`.

- [ ] **Step 1: 어댑터에 contentPreview 매핑**

`question-adapter.ts` — `MyQuestionListItemView`에 필드 추가 및 매핑:
```ts
interface MyQuestionListItemView {
  questionId: number
  title: string
  isResolved: boolean
  thumbnailSrc?: string
  answerCount: number
  createdAt: string
  contentPreview?: string   // BE 필드 오면 노출, 없으면 undefined(줄 생략)
}
```
`adaptMyQuestionItem` 반환에 추가:
```ts
    contentPreview: item.contentPreview?.trim() || undefined,
```

- [ ] **Step 2: 히스토리 아이템 부제 교체**

`question-history-item.tsx` — `answerCountLabel` 줄을 미리보기로 교체:
```tsx
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-title-semibold-16 text-gray-900">{item.title}</span>
        {item.contentPreview ? (
          <span className="truncate text-body-regular-14 text-gray-500">
            {item.contentPreview}
          </span>
        ) : null}
        {timeLabel ? <span className="text-body-regular-13 text-gray-400">{timeLabel}</span> : null}
      </div>
```
`messages` 사용이 `imageAlt`만 남으면 유지. `answerCountLabel` import/사용 제거.

- [ ] **Step 3: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. `pnpm dev`로 `/questions` 진입 시 카드가 [썸네일+제목+시각]로 렌더(미리보기 필드 없으면 그 줄 생략). BE가 preview를 주면 자동 노출.

- [ ] **Step 4: 커밋**
```bash
git add src/features/question/lib/question-adapter.ts src/features/question/components/question-history-item.tsx
git commit -m "feat: #92 질문 리스트 부제를 본문 미리보기로 교체"
```

---

## Task 4: ② 리스트 롱프레스 → 수정/삭제 오버레이

**Files:**
- Modify: `src/features/question/components/questions-list-page-content.tsx`
- Modify: `src/features/question/components/question-history-item.tsx`
- Modify: `src/lib/i18n/messages/{ko,en,ja,zh,th,ru,vi}.ts` (`editAction`)

**Interfaces:**
- Consumes: `LongPressActionOverlay`, `LongPressAction` (Task 2).
- Produces: 리스트에서 `onEdit(questionId)` 콜백 흐름.

- [ ] **Step 1: i18n `editAction` 키 추가(7개 카탈로그 + 타입)**

ko.ts `question` 타입 블록(라인 ~209 근처)에 `editAction: string` 추가, 값 블록(라인 ~603 근처)에 `editAction: "수정"`. 각 언어: en `"Edit"`, ja `"編集"`, zh `"编辑"`, th `"แก้ไข"`, ru `"Изменить"`, vi `"Chỉnh sửa"`.

- [ ] **Step 2: 히스토리 아이템에 anchor 전달**

`question-history-item.tsx` — `onLongPress: () => void`를 `onLongPress: (rect: DOMRect) => void`로 바꾸고, 루트 button에 ref 부착 후 롱프레스 시 rect 전달:
```tsx
  const ref = React.useRef<HTMLButtonElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })
```
`<button ref={ref} ...>` 추가. (`import * as React` 추가.)

- [ ] **Step 3: 리스트 페이지에 오버레이 배선**

`questions-list-page-content.tsx`:
- `import { Pencil, Trash2 } from "lucide-react"`, `import { LongPressActionOverlay, type LongPressAction } from ".../long-press-action-overlay"`, `import { CreateQuestionScreen } from ".../create-question-screen"`(Task 5에서 edit 모드 준비).
- 상태: `const [active, setActive] = React.useState<{ id: number; rect: DOMRect; view: MyQuestionListItemView } | null>(null)`, `const [editId, setEditId] = React.useState<number | null>(null)`.
- `onLongPress={(rect) => setActive({ id: item.questionId, rect, view: item })}`.
- 기존 `ChatContextMenu` 블록 제거, 대신:
```tsx
      {active && (
        <LongPressActionOverlay
          anchorRect={active.rect}
          onDismiss={() => setActive(null)}
          actions={[
            {
              icon: <Pencil className="size-5 text-gray-900" />,
              label: messages.question.editAction,
              onClick: () => setEditId(active.id),
            },
            {
              icon: <Trash2 className="size-5 text-red" />,
              label: messages.question.deleteAction,
              tone: "destructive",
              onClick: () => setPendingDeleteId(active.id),
            },
          ]}
        >
          <QuestionHistoryItem item={active.view} onOpen={() => {}} onLongPress={() => {}} />
        </LongPressActionOverlay>
      )}
```
(활성 행 클론은 전체 제목 노출을 위해 동일 컴포넌트 재사용. `menuFor` 상태/`ChatContextMenu` import 삭제.)

- [ ] **Step 4: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. `/questions`에서 항목 롱프레스 → 활성 행 부상 + dim + [수정/삭제] 메뉴. 삭제는 기존 ConfirmDialog 유지. 수정은 Task 5 완료 후 동작.

- [ ] **Step 5: 커밋**
```bash
git add src/features/question/components/questions-list-page-content.tsx src/features/question/components/question-history-item.tsx src/lib/i18n/messages
git commit -m "feat: #92 질문 리스트 롱프레스 수정/삭제 오버레이"
```

---

## Task 5: ③ 질문 수정 화면 (create-question-screen edit 모드)

**Files:**
- Modify: `src/features/question/components/create-question-screen.tsx`
- Modify: `src/features/question/components/questions-list-page-content.tsx` (edit 오버레이 렌더)
- Modify: `src/lib/i18n/messages/{...}.ts` (`editTitle`, `updateButton`)

**Interfaces:**
- Consumes: `useQuestionDetail`, `useUpdateQuestion` (기존).
- Produces: `CreateQuestionScreen`가 `mode`/`questionId` props 수용.

- [ ] **Step 1: i18n `editTitle`, `updateButton` 추가(7개 + 타입)**

ko: `editTitle: "질문 수정"`, `updateButton: "수정 완료"`. en `"Edit question"`/`"Save"`, ja `"質問を編集"`/`"完了"`, zh `"编辑问题"`/`"完成"`, th `"แก้ไขคำถาม"`/`"บันทึก"`, ru `"Изменить вопрос"`/`"Сохранить"`, vi `"Sửa câu hỏi"`/`"Lưu"`. 타입 블록에 두 키 추가.

- [ ] **Step 2: CreateQuestionScreen props 확장 + prefill**

`create-question-screen.tsx`:
- Props:
```tsx
interface CreateQuestionScreenProps {
  onClose: () => void
  mode?: "create" | "edit"
  questionId?: number
}
```
- edit이면 상세 fetch: `const detail = useQuestionDetail(questionId ?? 0, mode === "edit")` (adapt된 `QuestionDetailView` 반환 — 단, 장소 prefill을 위해 `location`이 필요하므로 raw fetch 사용). **주의:** `useQuestionDetail`의 select는 `location`을 노출하지 않는다 → 별도 훅 `useQuestionEditSource(questionId, enabled)`를 `use-question-queries.ts`에 추가해 raw `QuestionDetailResponse`를 반환하거나, adapter `QuestionDetailView`에 `location: LocationSnapshot`을 추가한다. **이 플랜은 adapter에 location 추가 방식 채택.**

  `question-adapter.ts` `QuestionDetailView`에 추가:
  ```ts
    location: LocationSnapshot
  ```
  `adaptQuestionDetail` 반환에 `location: detail.location,` 추가. (`import type { LocationSnapshot }` 추가.)

- prefill effect:
```tsx
  React.useEffect(() => {
    if (mode !== "edit" || !detail.data) return
    const d = detail.data
    setTitle(d.title)
    setContent(d.content)
    setPlace({
      lat: d.location.lat,
      lng: d.location.lng,
      address: d.location.address,
      label: d.location.label ?? d.location.address,
    })
    // 기존 이미지 미리보기(첫 장) — 재업로드 없으면 그대로 유지
    if (d.imageUrls[0]) setExistingImageUrl(d.imageUrls[0])
  }, [mode, detail.data])
```
`const [existingImageUrl, setExistingImageUrl] = React.useState<string | null>(null)` 추가. `MeetupImagePicker`의 `image`에 `image?.preview ?? existingImageUrl`.

- 제출 분기:
```tsx
    if (mode === "edit" && questionId != null) {
      let imageFileIds: number[] | undefined
      if (image) {
        try { imageFileIds = [await uploadImage(image.file)] }
        catch { setError(t.imageUploadFailed); return }
      }
      try {
        await updateQuestion.mutateAsync({
          title: title.trim(),
          content: content.trim(),
          location: { lat: place.lat, lng: place.lng, address: place.address, label: place.label },
          imageFileIds,
        })
        onClose()
      } catch (err) { setError(getQuestionErrorMessage(err, messages)) }
      return
    }
```
`const updateQuestion = useUpdateQuestion(questionId ?? 0)` (create 모드에선 미사용). 헤더 타이틀·버튼 라벨을 mode로 분기(`mode === "edit" ? t.editTitle : t.createTitle`, `t.updateButton`/`t.submitButton`).

- [ ] **Step 3: 리스트에서 edit 오버레이 렌더**

`questions-list-page-content.tsx` 하단에:
```tsx
      {editId != null && (
        <CreateQuestionScreen
          mode="edit"
          questionId={editId}
          onClose={() => setEditId(null)}
        />
      )}
```

- [ ] **Step 4: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. `/questions` 롱프레스 → 수정 → 제목/장소/내용/이미지 prefill된 편집 화면. 저장 시 `PATCH`(BE 미구현이면 에러 메시지, 흐름은 정상). 지도 FAB의 create 흐름은 `mode` 기본값 "create"로 회귀 무결.

- [ ] **Step 5: 커밋**
```bash
git add src/features/question/components src/lib/i18n/messages
git commit -m "feat: #92 질문 수정 화면(create 화면 edit 모드) prefill·장소 수정"
```

---

## Task 6: ④ 답변 채택 → 채팅 시작 토글 (다중 채택)

**Files:**
- Modify: `src/features/question/components/question-answer-author-item.tsx`
- Modify: `src/features/question/components/question-detail-screen.tsx`

**Interfaces:**
- Consumes: `useAcceptAnswer`, `useCreateQuestionRoom` (기존).

- [ ] **Step 1: author item 버튼 로직 교체**

`question-answer-author-item.tsx` — 우측 버튼 영역(현재 라인 56-79)을 per-answer 토글로:
```tsx
        {isReported ? (
          <span className="shrink-0 text-body-medium-14 text-red">
            {messages.question.reportAction}
          </span>
        ) : isMine ? (
          <Button variant="primary" size="sm" onClick={onStartChat}>
            {messages.question.personalChatLabel}
          </Button>
        ) : answer.isAccepted ? (
          <Button variant="primary" size="sm" onClick={onStartChat}>
            {messages.question.startChatLabel}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onAccept}>
            {messages.question.acceptButton}
          </Button>
        )}
```
(하단 "신고" 텍스트 링크는 Task 7에서 롱프레스로 대체하며 제거. `canAccept` prop 제거 → 다음 스텝에서 호출부 정리.)

- [ ] **Step 2: 상세 화면 다중 채택 게이트 + 채택 라벨 확인**

`question-detail-screen.tsx`:
- `QuestionAnswerAuthorItem` 사용부에서 `canAccept` prop 제거(다중 채택이므로 `!a.isAccepted`만으로 버튼 분기 → item 내부에서 `answer.isAccepted`로 처리).
- 채택 확인 다이얼로그의 description은 "질문이 해결 상태로 바뀌며 되돌릴 수 없어요"가 다중 채택과 안 맞으면 문구 완화(i18n `acceptConfirmDescription` 수정: "이 답변을 채택할까요?" 유지, 설명은 "채택하면 이 답변 작성자와 채팅을 시작할 수 있어요."로 7개 카탈로그 갱신).
- `handleStartChat`/`useCreateQuestionRoom`/`router.push('/chats/{roomId}')`는 기존 유지.

- [ ] **Step 3: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. 상세(작성자 시점): 미채택 답변=「답변 채택」(outline), 채택됨=「채팅 시작」(filled). 채택 → 쿼리 무효화 → 버튼 토글. 여러 답변 각각 채택 가능. 채팅 시작 → 방 생성(BE 미구현이면 `chatStartFailed` 토스트) → 성공 시 `/chats/{id}`.

- [ ] **Step 4: 커밋**
```bash
git add src/features/question/components src/lib/i18n/messages
git commit -m "feat: #92 답변 채택→채팅 시작 per-answer 토글(다중 채택)"
```

---

## Task 7: ⑤ 답변 롱프레스 → 신고 (그 답변만 제거)

**Files:**
- Modify: `src/features/question/components/question-answer-author-item.tsx`
- Modify: `src/features/question/components/question-detail-screen.tsx`

**Interfaces:**
- Consumes: `LongPressActionOverlay` (Task 2), `useLongPress`, `useReportAnswer` (기존).

- [ ] **Step 1: author item에 롱프레스 부착, 하단 신고 링크 제거**

`question-answer-author-item.tsx`:
- props: `onReport` 유지하되 시그니처를 `onLongPress: (rect: DOMRect) => void`로 바꾸고 하단 신고 텍스트 링크(현재 라인 94-102) 제거.
- 루트 div에 ref + `useLongPress`:
```tsx
  const ref = React.useRef<HTMLDivElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })
```
루트 `<div ref={ref} {...longPress} ...>`. (본인 답변 `isMine`이면 롱프레스 비활성 — 신고 대상 아님: `isMine ? {} : longPress` 스프레드.)

- [ ] **Step 2: 상세 화면에 답변 신고 오버레이 + 제거 배선**

`question-detail-screen.tsx`:
- 상태: `const [activeAnswer, setActiveAnswer] = React.useState<{ id: number; rect: DOMRect; view: QuestionAnswerView } | null>(null)`, `const [removedIds, setRemovedIds] = React.useState<Set<number>>(new Set())`.
- 답변 목록 렌더에서 `removedIds.has(a.answerId)` 항목 필터로 제외. (기존 `reportedIds` 블러 로직 제거.)
- `QuestionAnswerAuthorItem`에 `onLongPress={(rect) => setActiveAnswer({ id: a.answerId, rect, view: a })}`.
- 오버레이:
```tsx
      {activeAnswer && (
        <LongPressActionOverlay
          anchorRect={activeAnswer.rect}
          onDismiss={() => setActiveAnswer(null)}
          actions={[
            {
              icon: <Flag className="size-5 text-red" />,
              label: messages.question.reportAction,
              tone: "destructive",
              onClick: () => setPendingReportId(activeAnswer.id),
            },
          ]}
        >
          <QuestionAnswerAuthorItem
            answer={activeAnswer.view}
            isMine={false}
            isReported={false}
            onStartChat={() => {}}
            onAccept={() => {}}
            onLongPress={() => {}}
          />
        </LongPressActionOverlay>
      )}
```
(`import { Flag } from "lucide-react"`, `import { LongPressActionOverlay } from ".../long-press-action-overlay"`, `import type { QuestionAnswerView } from ".../question-adapter"`.)
- `handleConfirmReport` 성공 시: `setRemovedIds(prev => new Set(prev).add(answerId))`(블러 대신 제거), 토스트 유지.

- [ ] **Step 3: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. 상세에서 답변 롱프레스 → 활성 답변 부상 + [신고] → 확인 → 성공 시 그 답변만 목록에서 사라짐(BE 미구현이면 실패 토스트, 제거 안 함).

- [ ] **Step 4: 커밋**
```bash
git add src/features/question/components
git commit -m "feat: #92 답변 롱프레스 신고 오버레이 + 신고 시 해당 답변만 제거"
```

---

## Task 8: ⑥ 채팅창 + 더보기 Figma 정렬

**Files:**
- Modify: `src/features/chat/components/chat-room-page-content.tsx`
- Modify(필요 시): `chat-room-more-header.tsx`, `chat-room-info-section.tsx`, `chat-room-member-item.tsx`, `chat-room-danger-actions.tsx`, `chat-bubble.tsx`, `chat-message-input.tsx`

**Interfaces:** 기존 채팅 컴포넌트 재사용. 신규 계약 없음.

- [ ] **Step 1: Figma 대조 diff 산출**

두 Figma(958-4520 채팅창 / 1722-13148 더보기)를 기준으로 각 컴포넌트 현재 렌더와 비교하여 **차이 목록**을 먼저 뽑는다(헤더 타이틀/뒤로·햄버거 아이콘, 날짜 구분선, 버블 색/정렬/시각, 입력바 아이콘, 더보기: 프로필·"대화 상대 N"·멤버 국기·"채팅방 나가기" 빨강). diff가 없으면 이 태스크는 no-op으로 종료(변경 없음 확인 커밋 생략).

- [ ] **Step 2: 차이만 반영**

diff 목록의 각 항목을 최소 수정으로 정렬. 하드코딩 문자열은 `messages.chat`에 추가. 색/타이포는 토큰 클래스 사용.

- [ ] **Step 3: 타입체크 + 구동 확인**

Run: `pnpm build`
Expected: 통과. `/chats/{id}` 및 더보기 패널이 Figma와 일치.

- [ ] **Step 4: 커밋(변경 있을 때만)**
```bash
git add src/features/chat/components src/lib/i18n/messages
git commit -m "refactor: #92 채팅창·더보기 Figma 정렬"
```

---

## Task 9: 최종 검증 + PR

- [ ] **Step 1: 클린 빌드 + 린트**

Run: `pnpm build && pnpm lint`
Expected: 둘 다 에러 0.

- [ ] **Step 2: 전체 흐름 수동 검증(verify 스킬)**

리스트(미리보기)→롱프레스(수정 prefill·삭제)→상세(채택 토글·다중 채택·채팅 시작 라우팅)→답변 신고(제거)→채팅창/더보기. BE 미구현 경로는 에러 토스트로 우아하게 처리되는지 확인.

- [ ] **Step 3: 이슈 #92 체크리스트 동기화**

완료 항목 체크, 미완/후속(BE 대기)은 이슈 본문에 남김.

- [ ] **Step 4: 브랜치 push + PR(base develop)**

```bash
git push -u origin feat/#92
gh pr create --base develop --title "[refactor] #92 질문 페이지 전면 리팩토링" --body "설계: docs/superpowers/specs/2026-07-14-question-pages-refactor-design.md · 구현: docs/superpowers/plans/2026-07-14-question-pages-refactor.md. BE 의존 6건 이슈 링크. Closes #92"
```
(로컬 merge 금지 — PR로만 통합.)

---

## Self-Review 결과

- **스펙 커버리지:** ①리스트=T3, ②롱프레스수정/삭제=T4, ③수정화면=T5, ④채택토글=T6, ⑤답변신고=T7, ⑥채팅창/더보기=T8, 공통오버레이=T2, 계약/BE이슈=T1. 전 항목 매핑됨.
- **플레이스홀더:** T8만 "diff 산출 후 반영" 구조 — 대상 컴포넌트/차이 후보를 명시해 실행 가능. 나머지 코드 제시 완료.
- **타입 일관성:** `contentPreview`/`location`(T1)→T3/T5 소비, `LongPressActionOverlay`/`LongPressAction`(T2)→T4/T7 소비, `onLongPress:(rect:DOMRect)=>void` 시그니처 T4·T7 일치, `QuestionDetailView.location` 추가(T5)→edit prefill 소비. 일치 확인.
