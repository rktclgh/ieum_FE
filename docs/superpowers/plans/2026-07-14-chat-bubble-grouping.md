# 채팅 말풍선 그룹화 (#78) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연속된 같은 발신자·같은 분 메시지를 이름 1회 + 말풍선 스택 + 시각 1회로 묶어 표시한다.

**Architecture:** 메시지 1개 = 여전히 독립 렌더 단위(행 분할). run(같은 발신자+같은 분) chrome는 신규 `ChatMessageGroup`이, 단일 말풍선은 신규 `ChatBubbleSegment`가 담당하고, 기존 `MessageRow`가 세그먼트를 감싸 롱프레스+messageId 타깃을 유지한다. 그룹핑은 순수 파생 함수 `buildMessageRuns`로 계산한다.

**Tech Stack:** Next.js(App Router), React, TypeScript, Tailwind, pnpm.

## Global Constraints

- 패키지 매니저는 **pnpm** (never npm). — `pnpm-lock.yaml` 존재.
- 폴더/파일명은 lowercase kebab-case.
- 하드코딩 한국어 UI 문자열 금지 → i18n 카탈로그. (본 작업은 신규 UI 문자열 없음; 기존 `messages.*` 재사용.)
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러 금지.
- 브랜치: `feat/#78` (이미 워크트리 `.claude/worktrees/feat-78`, base=develop).
- 테스트 러너 없음 → 각 태스크 검증 게이트 = `pnpm lint` + `pnpm build` 클린. 최종 육안 검증.
- 이슈 완료 시 `#78` 체크리스트 반영.

## File Structure

- `src/lib/date/kst.ts` (modify) — `getKstMinuteKey` 추가.
- `src/features/chat/lib/chat-adapter.ts` (modify) — `ChatBubbleMessage.senderId`, `ChatMessageRun` 타입, `buildMessageRuns` 함수.
- `src/features/chat/components/chat-bubble-segment.tsx` (create) — 단일 말풍선 div + `bubblePosition`/반경 맵(공유 소스).
- `src/features/chat/components/chat-bubble.tsx` (modify) — 반경 맵/`bubblePosition`을 segment에서 import(중복 제거).
- `src/features/chat/components/chat-message-group.tsx` (create) — run chrome(아바타/이름/시각 1회).
- `src/features/chat/components/chat-room-page-content.tsx` (modify) — `MessageRow`를 세그먼트 렌더로 교체, run 단위 렌더 트리.

---

## Task 1: 데이터 모델 — senderId + 분 단위 키

**Files:**
- Modify: `src/lib/date/kst.ts`
- Modify: `src/features/chat/lib/chat-adapter.ts`

**Interfaces:**
- Produces:
  - `getKstMinuteKey(input: Date | string | number): string` — KST `"YYYY-MM-DD HH:mm"`.
  - `ChatBubbleMessage.senderId: number` (신규 필드).

- [ ] **Step 1: `kst.ts`에 `getKstMinuteKey` 추가**

기존 `getKstTimeParts` 함수 아래에 추가하고 export 목록에 넣는다:

```ts
/** 그룹핑용 분 단위 키: KST 기준 "2026-07-09 08:21". */
function getKstMinuteKey(input: Date | string | number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(input))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`
}
```

`export { ... }` 블록에 `getKstMinuteKey` 추가.

- [ ] **Step 2: `chat-adapter.ts` — `ChatBubbleMessage`에 `senderId` 추가**

`interface ChatBubbleMessage` 에 필드 추가:

```ts
interface ChatBubbleMessage {
  id: string
  messageId: number
  senderId: number
  sender: "me" | "others"
  variant: "long" | "short"
  name?: string
  texts: string[]
  imageUrl?: string
  time: string
  createdAt: string
}
```

- [ ] **Step 3: `adaptMessage`에서 `senderId` 채우기**

`return { ... }` 객체에 추가:

```ts
  return {
    id: String(message.messageId),
    messageId: message.messageId,
    senderId: message.senderId,
    sender: isMe ? "me" : "others",
    variant: content.length > 30 ? "long" : "short",
    name: isMe ? undefined : message.senderNickname,
    texts: content ? [content] : message.imageUrl ? ["사진"] : [""],
    imageUrl: resolveFileUrl(message.imageUrl),
    time: formatKstTime(message.createdAt),
    createdAt: message.createdAt,
  }
```

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 클린 통과 (신규 export/필드는 미사용이어도 통과).

- [ ] **Step 5: Commit**

```bash
git add src/lib/date/kst.ts src/features/chat/lib/chat-adapter.ts
git commit -m "feat: #78 그룹핑용 senderId·분 단위 키 추가"
```

---

## Task 2: `ChatBubbleSegment` — 단일 말풍선 + 반경 공유

**Files:**
- Create: `src/features/chat/components/chat-bubble-segment.tsx`
- Modify: `src/features/chat/components/chat-bubble.tsx`

**Interfaces:**
- Consumes: 없음.
- Produces:
  - `bubblePosition(index: number, total: number): "solo" | "first" | "middle" | "last"`
  - `ChatBubbleSegment` — props `{ sender: "me"|"others"; text: string; position: "solo"|"first"|"middle"|"last"; variant: "long"|"short" } & React.ComponentProps<"div">`

- [ ] **Step 1: `chat-bubble-segment.tsx` 생성**

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

type BubblePosition = "solo" | "first" | "middle" | "last"

const OTHERS_RADIUS = {
  solo: "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl",
  first: "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl",
  middle: "rounded-tl-[4px] rounded-tr-3xl rounded-bl-[4px] rounded-br-3xl",
  last: "rounded-tr-3xl rounded-bl-3xl rounded-br-3xl",
} as const

const ME_RADIUS = {
  solo: "rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl",
  first: "rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]",
  middle: "rounded-tl-3xl rounded-bl-3xl",
  last: "rounded-tl-3xl rounded-bl-3xl rounded-br-3xl",
} as const

function bubblePosition(index: number, total: number): BubblePosition {
  if (total <= 1) return "solo"
  if (index === 0) return "first"
  if (index === total - 1) return "last"
  return "middle"
}

interface ChatBubbleSegmentProps extends React.ComponentProps<"div"> {
  sender: "me" | "others"
  text: string
  position: BubblePosition
  variant: "long" | "short"
}

/** 그룹 내 단일 메시지 말풍선. 이름/아바타/시각은 상위 ChatMessageGroup이 담당한다. */
function ChatBubbleSegment({ className, sender, text, position, variant, ...props }: ChatBubbleSegmentProps) {
  const isMe = sender === "me"
  const radiusMap = isMe ? ME_RADIUS : OTHERS_RADIUS
  return (
    <div
      data-slot="chat-bubble-segment"
      className={cn(
        "px-4 py-3",
        isMe ? "bg-primary-400" : "bg-gray-50",
        radiusMap[position],
        variant === "long" && "w-[253px] max-w-full",
        className
      )}
      {...props}
    >
      <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{text}</p>
    </div>
  )
}

export { ChatBubbleSegment, bubblePosition, ME_RADIUS, OTHERS_RADIUS }
export type { BubblePosition }
```

- [ ] **Step 2: `chat-bubble.tsx` — 반경 맵/`bubblePosition` 중복 제거**

`chat-bubble.tsx` 상단 import에 추가:

```tsx
import { ME_RADIUS, OTHERS_RADIUS, bubblePosition } from "@/features/chat/components/chat-bubble-segment"
```

그리고 `chat-bubble.tsx` 내부의 로컬 `const OTHERS_RADIUS = {...}`, `const ME_RADIUS = {...}`, `function bubblePosition(...) {...}` **세 정의를 삭제**한다. 나머지 사용부(`radiusMap[bubblePosition(index, texts.length)]`)는 그대로 둔다.

- [ ] **Step 3: 검증**

Run: `pnpm lint && pnpm build`
Expected: 클린 통과. `ChatBubble` 렌더 결과 동일(반경 맵 이동만).

- [ ] **Step 4: Commit**

```bash
git add src/features/chat/components/chat-bubble-segment.tsx src/features/chat/components/chat-bubble.tsx
git commit -m "feat: #78 단일 말풍선 ChatBubbleSegment 추출·반경 로직 공유"
```

---

## Task 3: `ChatMessageGroup` — run chrome

**Files:**
- Create: `src/features/chat/components/chat-message-group.tsx`

**Interfaces:**
- Consumes: 없음(children으로 세그먼트 행을 받음).
- Produces:
  - `ChatMessageGroup` — props `{ sender: "me"|"others"; name?: string; time?: string; avatarSrc?: string; children: React.ReactNode }`

**참고:** 현재 `ChatBubble`은 `avatarSrc`를 실제로 넘겨받지 않아 기본 placeholder 아바타를 그린다. 본 그룹도 동일하게 `avatarSrc` 미지정 시 기본 placeholder를 유지한다(실제 아바타 배선은 #78 범위 밖).

- [ ] **Step 1: `chat-message-group.tsx` 생성**

others는 `items-end`로 아바타를 하단 정렬(시각 옆), 이름은 컬럼 상단, 시각은 컬럼 하단에 1회 렌더한다. me는 우측 정렬·아바타 없음.

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface ChatMessageGroupProps {
  sender: "me" | "others"
  name?: string
  time?: string
  avatarSrc?: string
  children: React.ReactNode
}

/** 같은 발신자·같은 분 연속 메시지(run) 한 묶음의 chrome: 아바타/이름/시각 1회. */
function ChatMessageGroup({ sender, name, time, avatarSrc, children }: ChatMessageGroupProps) {
  const isMe = sender === "me"
  return (
    <div className={cn("flex w-full items-end gap-2 py-2", isMe && "justify-end")}>
      {!isMe && <ChatProfile src={avatarSrc} size={26} />}
      <div className={cn("flex max-w-[75%] flex-col gap-1", isMe ? "items-end" : "items-start")}>
        {!isMe && name && <p className="text-body-regular-12 text-gray-400">{name}</p>}
        {children}
        {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
      </div>
    </div>
  )
}

export { ChatMessageGroup }
```

- [ ] **Step 2: 검증**

Run: `pnpm lint && pnpm build`
Expected: 클린 통과(미사용 컴포넌트여도 export라 통과).

- [ ] **Step 3: Commit**

```bash
git add src/features/chat/components/chat-message-group.tsx
git commit -m "feat: #78 run chrome ChatMessageGroup 추가"
```

---

## Task 4: `buildMessageRuns` — 순수 그룹핑 함수

**Files:**
- Modify: `src/features/chat/lib/chat-adapter.ts`

**Interfaces:**
- Consumes: `ChatBubbleMessage`(Task 1의 `senderId`), `getKstMinuteKey`(Task 1).
- Produces:
  - `interface ChatMessageRun { runKey: string; sender: "me"|"others"; name?: string; time: string; messages: ChatBubbleMessage[] }`
  - `buildMessageRuns(messages: ChatBubbleMessage[]): ChatMessageRun[]`

- [ ] **Step 1: import에 `getKstMinuteKey` 추가**

`chat-adapter.ts` 상단의 `import { formatKstTime } from "@/lib/date/kst"` 를 다음으로 교체:

```ts
import { formatKstTime, getKstMinuteKey } from "@/lib/date/kst"
```

- [ ] **Step 2: `buildMessageRuns` 추가**

`adaptMessage` 함수 아래에 추가한다. 이미 날짜(일) 단위로 묶인 메시지 배열을 받아, 연속 `senderId`+`분` 동일 구간을 run으로 만든다:

```ts
interface ChatMessageRun {
  runKey: string
  sender: "me" | "others"
  name?: string
  time: string
  messages: ChatBubbleMessage[]
}

// 연속된 같은 발신자(senderId)·같은 분(minute) 메시지를 하나의 run으로 묶는다.
// 입력은 이미 오래된→최신 정렬 + 같은 날짜 그룹 내 메시지를 가정한다.
function buildMessageRuns(messages: ChatBubbleMessage[]): ChatMessageRun[] {
  const runs: ChatMessageRun[] = []
  let currentKey: string | null = null
  for (const message of messages) {
    const minuteKey = `${message.senderId}|${getKstMinuteKey(message.createdAt)}`
    const lastRun = runs[runs.length - 1]
    if (lastRun && currentKey === minuteKey) {
      lastRun.messages.push(message)
    } else {
      runs.push({
        runKey: message.id,
        sender: message.sender,
        name: message.name,
        time: message.time,
        messages: [message],
      })
    }
    currentKey = minuteKey
  }
  return runs
}
```

- [ ] **Step 3: export**

`export { ... }` 함수 블록에 `buildMessageRuns` 추가, `export type { ... }` 블록에 `ChatMessageRun` 추가.

- [ ] **Step 4: 검증**

Run: `pnpm lint && pnpm build`
Expected: 클린 통과.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/lib/chat-adapter.ts
git commit -m "feat: #78 연속 발신자·분 그룹핑 buildMessageRuns 추가"
```

---

## Task 5: 페이지 배선 — run 렌더 트리 + MessageRow 세그먼트화

**Files:**
- Modify: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Consumes: `ChatMessageGroup`(Task 3), `ChatBubbleSegment`+`bubblePosition`(Task 2), `buildMessageRuns`+`ChatMessageRun`(Task 4).

- [ ] **Step 1: import 추가**

상단 import 블록에 추가:

```tsx
import { ChatBubbleSegment, bubblePosition } from "@/features/chat/components/chat-bubble-segment"
import { ChatMessageGroup } from "@/features/chat/components/chat-message-group"
```

그리고 `chat-adapter`에서 `buildMessageRuns`를 가져오도록 기존 import에 추가:

```tsx
import {
  adaptMember,
  adaptMessage,
  buildMessageRuns,
  resolveRoomTitle,
  type ChatBubbleMessage,
} from "@/features/chat/lib/chat-adapter"
```

기존에서 쓰던 `ChatBubble` import는 페이지에서 더 이상 직접 사용하지 않으면 제거한다(사용처 확인 후). — `import { ChatBubble } from ...` 라인 삭제.

- [ ] **Step 2: `MessageRow`를 세그먼트 렌더로 교체**

`MessageRowProps`에 `position` 추가, 렌더 대상을 `ChatBubbleSegment`로 교체(이름/아바타/시각은 그룹이 담당하므로 넘기지 않음). 롱프레스 메뉴 오프셋은 others가 이미 그룹 컬럼에서 들여쓰기되므로 `left-0`으로 조정:

```tsx
interface MessageRowProps {
  message: ChatBubbleMessage
  position: "solo" | "first" | "middle" | "last"
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function MessageRow({ message, position, menuOpen, menuItems, onOpenMenu, onCloseMenu }: MessageRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const isMe = message.sender === "me"

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < MESSAGE_MENU_HEIGHT_ESTIMATE + MESSAGE_BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative" {...longPress}>
      <ChatBubbleSegment
        sender={message.sender}
        text={message.texts[0] ?? ""}
        position={position}
        variant={message.variant}
        className={cn(menuOpen && "relative z-50")}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            isMe ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-3" : "top-full mt-2"
          )}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 렌더 트리 — dateGroup 하위를 run 단위로**

기존 `group.messages.map((message) => (<MessageRow .../>))` 부분을 run 단위로 교체:

```tsx
                  <ChatDateDivider text={group.label} />
                  {buildMessageRuns(group.messages).map((run) => (
                    <ChatMessageGroup
                      key={run.runKey}
                      sender={run.sender}
                      name={run.name}
                      time={run.time}
                    >
                      {run.messages.map((message, index) => (
                        <MessageRow
                          key={message.id}
                          message={message}
                          position={bubblePosition(index, run.messages.length)}
                          menuOpen={activeMessageId === message.id}
                          menuItems={messageMenuItems(message)}
                          onOpenMenu={() => setActiveMessageId(message.id)}
                          onCloseMenu={() => setActiveMessageId(null)}
                        />
                      ))}
                    </ChatMessageGroup>
                  ))}
```

- [ ] **Step 4: 검증(빌드/린트)**

Run: `pnpm lint && pnpm build`
Expected: 클린 통과. `ChatBubble` 미사용 import 잔존 시 lint 실패 → 제거 확인.

- [ ] **Step 5: 육안 검증**

Run: `pnpm dev` 후 그룹 채팅방 진입(또는 실제 배포/로컬 BE 세션).
확인 항목:
- 같은 발신자·같은 분 연속 메시지가 이름 1회 + 스택(반경 first/middle/last) + 시각 1회로 묶임.
- others는 아바타 1회(하단), me는 우측 정렬·아바타 없음, solo(단일)는 solo 반경.
- 날짜 경계에서 run이 쪼개짐(기존 날짜 구분선과 정합).
- 롱프레스 → 그룹 내 개별 메시지 각각 메뉴 열림, 신고 시 올바른 messageId/이름 전달.
- 컨텍스트 메뉴 위치가 말풍선 기준으로 어긋나지 않음(`left-0`/`right-0`).

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/components/chat-room-page-content.tsx
git commit -m "feat: #78 채팅 말풍선 발신자·분 단위 그룹화 렌더"
```

---

## Task 6: 이슈 반영 + 마무리

**Files:** 없음(빌드/이슈).

- [ ] **Step 1: 전체 재검증**

Run: `pnpm lint && pnpm build`
Expected: 클린.

- [ ] **Step 2: 이슈 #78 체크리스트 반영**

`gh issue edit 78` 또는 코멘트로 완료 항목 체크, 문서화 안 된 작업(신규 컴포넌트 2개, `buildMessageRuns`, `getKstMinuteKey`) 반영.

- [ ] **Step 3: 통합 — PR (직접 develop 병합 금지)**

```bash
git push -u origin feat/#78
gh pr create --base develop --title "feat: #78 채팅 말풍선 발신자·분 단위 그룹화" --body "Closes #78"
```

---

## Self-Review

**Spec coverage:**
- 그룹핑(senderId+분) → Task 1(senderId/키)+Task 4(buildMessageRuns). ✅
- run 렌더(이름/시각 1회, first/middle/last) → Task 2(세그먼트/반경)+Task 3(그룹 chrome)+Task 5(배선). ✅
- me/others/solo → Task 2 반경 + Task 3 정렬 + Task 5 `bubblePosition`. ✅
- 날짜 경계 정합 → Task 5(dateGroups 하위에서 run 생성). ✅
- 롱프레스 개별 messageId 유지 → Task 5 MessageRow(기존 플로우 보존). ✅
- 아바타 하단 1회 → Task 3(`items-end`). ✅
- pnpm build/lint 클린 → 각 태스크 검증 게이트. ✅

**Placeholder scan:** 모든 코드 스텝에 실제 코드 포함, "TODO/적절히 처리" 없음. ✅

**Type consistency:** `ChatBubbleMessage.senderId`(T1) → `buildMessageRuns`(T4) 사용; `ChatMessageRun`(T4) → 페이지(T5) 사용; `bubblePosition`(T2) → 페이지(T5) 사용; `ChatBubbleSegment` props(T2) ↔ MessageRow 호출(T5) 일치. ✅
