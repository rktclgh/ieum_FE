# 모임 채팅방 나가기·회원관리·이탈 시스템 메시지 (#171) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모임 채팅방의 일반 참가자가 정본 모임 나가기 API로 정상 이탈하게 하고, 방장이 기존 회원관리 UI와 강퇴 API로 참여자를 내보낼 수 있게 한다. 자진 나가기와 강퇴는 백엔드가 영속화·fanout한 같은 `messageType=system` 메시지를 중앙 회색 pill로 표시한다.

**Architecture:** 방 타입을 보존한 통합 leave target이 direct/question에는 기존 chat leave, group에는 meeting leave를 선택한다. group panel의 회원 목록은 `GET /meetings/{id}/participants`를 정본으로, chat room member는 국적 flag 보강으로만 사용한다. message adapter는 `userRun | system` timeline union을 만들고, system은 일반 말풍선과 독립된 presentation component로 렌더한다. 열린 방의 STOMP 연결은 room topic 외에 자기 `queue/rooms` remove도 수신해 강퇴 대상의 접근 종료를 즉시 반영한다.

**Tech Stack:** Next.js, React 19, TypeScript, TanStack Query, STOMP, Tailwind design tokens, Node 22 `node:test`, pnpm.

## Global Constraints

- Base branch is `develop`; this worktree branch is `171-fix-meeting-chat-leave-member-management`.
- Do not modify unrelated untracked changes in the primary worktree.
- Group room must never fall back to `POST /api/v1/chat/rooms/{roomId}/leave`; missing `meetingId` is a visible domain-link failure.
- Reuse existing `ChatRoomMemberItem`, `crown.svg`, outline remove button, `ConfirmDialog`, and meetup kick API/hook. Add no image asset or new UI package.
- Only a group host sees a remove control; host/self rows never render one. Server authorization remains the source of truth.
- Both voluntary leave and kick render the exact server `system` content (`{nickname}님이 모임을 떠났습니다`) identically; do not add a reason-specific message or a new i18n key.
- A system timeline item is noninteractive: no avatar, sender chrome, timestamp, long press, notice, report, image, reply, or optimistic-message behavior.
- Every behavior change follows RED → minimal implementation → focused GREEN → Korean commit.
- Local API SSOT is updated before the matching Notion page; Notion is marked `구현완료` only after code, SSOT, and verification agree.

---

## File Map

- `src/features/chat/api/chat-types.ts` — additive `messageType`, leave target fields, room-event type use.
- `src/features/chat/api/chat-api.ts` — retain direct/question leave transport only.
- `src/features/chat/hooks/use-chat-mutations.ts` — unified type-aware leave mutation and cache cleanup.
- `src/features/chat/lib/chat-adapter.ts` — preserve `roomType`/`meetingId`; adapt `user|system` message view values.
- `src/features/chat/lib/chat-timeline.ts` — new pure `userRun | system` grouping function.
- `src/features/chat/lib/chat-timeline.test.ts` — Node built-in regression tests.
- `scripts/ci/test-client-contracts.sh` — execute the new Node timeline test in CI.
- `src/features/chat/components/chat-system-message.tsx` — new centered noninteractive system pill.
- `src/features/chat/components/chat-room-member-item.tsx` — pending disabled state and accessible remove label on the existing control.
- `src/features/chat/components/chat-room-page-content.tsx` — leave selection, participant-backed member list, kick confirm/error, timeline rendering, cache refresh, redirect handler.
- `src/features/chat/components/chat-list-page-content.tsx` — long-press group leave uses the same typed target.
- `src/features/chat/lib/chat-socket.ts` — active room socket receives matching `/user/queue/rooms` remove.
- `src/features/meetup/hooks/use-meetup-queries.ts` / `use-meetup-mutations.ts` — reuse existing participant/kick query contracts; only add precise cache invalidation if missing.
- `docs/superpowers/specs/2026-07-16-meeting-chat-leave-system-message-ui-design.md` — approved UI/interaction contract.
- workspace `code/api/API-SPEC.md` and Notion API records — synchronized only after verified backend/FE contracts.

---

### Task 1: Lock the system-message timeline contract with a failing pure test

**Files:**
- Create: `src/features/chat/lib/chat-timeline.ts`
- Create: `src/features/chat/lib/chat-timeline.test.ts`
- Modify: `scripts/ci/test-client-contracts.sh`
- Modify: `src/features/chat/api/chat-types.ts`
- Modify: `src/features/chat/lib/chat-adapter.ts`
- Create: `src/features/chat/components/chat-system-message.tsx`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Produces: `ChatMessageView = ChatUserBubbleMessage | ChatSystemMessage`, then `ChatTimelineItem = ChatUserMessageRun | ChatSystemMessageItem`.
- Preserves: ordinary user messages are grouped only when adjacent sender and KST minute match; missing server `messageType` normalizes to `user` during rolling deploys.

- [ ] **Step 1: Write RED tests before changing the adapter**

Use `node:test` and no React runtime. Cover all of:

```ts
user -> system -> same-user-same-minute user // three timeline items, never one merged run
system -> system                             // two distinct system items
missing messageType                          // normalizes to user
same sender + same minute user messages      // one normal user run
REST/WS duplicate messageId                  // existing merge remains deduped upstream
```

The test should pass a trivial `minuteKeyFor` dependency rather than importing KST/runtime aliases. Register it in `scripts/ci/test-client-contracts.sh` using:

```bash
node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts
```

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts
```

Expected: fail because the timeline module and system type do not exist.

- [ ] **Step 3: Implement the type-safe view union and renderer atomically**

Add optional wire type `messageType?: "user" | "system"`, normalize once in `adaptMessage`, and keep `ChatBubbleMessage` strictly user-only. Introduce `ChatMessageView = ChatUserBubbleMessage | ChatSystemMessage` at the adapter boundary, then change `useChatMessages`, active-room `liveMessages`, `mergeMessages`, and date-group types to consume that union. Put a `system` item directly in a `ChatTimelineItem` union so the existing `buildMessageRuns` cannot accidentally receive it, and make it a hard grouping boundary.

In the **same atomic change**, add `ChatSystemMessage` and branch the page renderer before `ChatMessageGroup`; otherwise the page's `ChatBubbleMessage[]` assumptions cannot typecheck safely. The component must be a non-button centered pill:

```tsx
<div className="flex w-full justify-center py-2" role="status" aria-live="polite">
  <p className="max-w-[calc(100%-2rem)] break-words rounded-full bg-gray-700 px-3 py-1 text-center text-body-regular-12 text-white">
    {content}
  </p>
</div>
```

It has no avatar, timestamp, `MessageRow`, long-press handler, context menu, or image affordance.

- [ ] **Step 4: Run focused GREEN and contracts**

```bash
node --experimental-strip-types --test src/features/chat/lib/chat-timeline.test.ts
pnpm test:contracts
pnpm lint
pnpm typecheck
```

Expected: both pass; no new dependency is installed.

- [ ] **Step 5: Commit the isolated timeline contract**

```bash
git add src/features/chat/api/chat-types.ts src/features/chat/lib/chat-adapter.ts src/features/chat/lib/chat-timeline.ts src/features/chat/lib/chat-timeline.test.ts scripts/ci/test-client-contracts.sh src/features/chat/components/chat-system-message.tsx src/features/chat/components/chat-room-page-content.tsx
git commit -m "채팅 시스템 메시지 타임라인 분리"
```

---

### Task 2: Verify the reference-like noninteractive system pill

**Files:**
- Review: `src/features/chat/components/chat-system-message.tsx`
- Review: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Verifies: one full-width, centered semantic system message for a timeline system item.
- Preserves: `MessageRow`, `ChatMessageGroup`, long-press menu, notice, report, image upload, and optimistic behavior for user messages only.

- [ ] **Step 1: Review the render branch after the atomic type conversion**

Extend the timeline/component contract test where practical to prove a system item takes the `ChatSystemMessage` branch, not `ChatMessageGroup`/`MessageRow`. Explicitly assert the system item has no message action target.

- [ ] **Step 2: Run visual/type validation**

```bash
pnpm lint
pnpm typecheck
```

Expected: no union narrowing errors and no accessibility lint issue.

---

### Task 3: Route all group leave actions to the canonical meeting API

**Files:**
- Modify: `src/features/chat/hooks/use-chat-mutations.ts`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`
- Modify: `src/features/chat/components/chat-list-page-content.tsx`
- Modify: `src/features/chat/lib/chat-adapter.ts`

**Interfaces:**
- Consumes: `{ roomId, roomType, meetingId }` leave target.
- Calls: direct/question → `leaveRoom(roomId)`; group → existing `leaveMeeting(meetingId)`.
- Preserves: direct/question API, cache behavior, and user navigation.

- [ ] **Step 1: Write a RED decision test or pure decision helper test**

Add coverage for direct, question, group with id, and group without id. The last case must reject with a typed/local domain-link error and must not call `leaveRoom`.

- [ ] **Step 2: Implement one type-aware leave mutation**

Move API selection into one mutation helper; do not leave two callers with duplicated `if (roomType === "group")` logic. On group success invalidate meeting detail/participants and remove current room/message caches; direct/question retain the old cleanup. Retain the current router success behavior in both page and list contexts.

- [ ] **Step 3: Connect the detail panel and long-press list path**

Use the actual detail room's `roomType`/`meetingId` in the panel. Preserve the same fields in `ChatListEntry` so the long-press destructive action makes the same call. Group copy uses existing meetup leave labels; direct/question keeps existing chat leave copy. Map group API errors through the existing meetup error message helper.

- [ ] **Step 4: Run focused validation**

```bash
pnpm test:contracts
pnpm lint
pnpm typecheck
```

- [ ] **Step 5: Commit the canonical leave routing**

```bash
git add src/features/chat/hooks/use-chat-mutations.ts src/features/chat/components/chat-room-page-content.tsx src/features/chat/components/chat-list-page-content.tsx src/features/chat/lib/chat-adapter.ts
git commit -m "모임 채팅 나가기 API 연결 수정"
```

---

### Task 4: Expose existing host member management in the chat panel

**Files:**
- Modify: `src/features/chat/components/chat-room-page-content.tsx`
- Modify: `src/features/chat/components/chat-room-member-item.tsx`
- Reuse: `src/features/meetup/hooks/use-meetup-queries.ts`, `src/features/meetup/hooks/use-meetup-mutations.ts`

**Interfaces:**
- Consumes: existing `GET /meetings/{meetingId}/participants`, `POST /meetings/{meetingId}/kick { userId }`.
- Produces: host-only remove control, existing confirmation dialog, pending/error states, joined participant count and host-first list.

- [ ] **Step 1: Add RED state/model coverage**

Add a pure member-list helper test if component testing is unavailable. It must prove: participant data is the list SSOT; host sorts first; room member metadata only enriches nationality; only host can remove non-self/non-host participants; missing room metadata does not hide a joined participant.

- [ ] **Step 2: Build the participant-backed view model**

Fetch participants only while authenticated group panel is open. Create the panel list from this response, host-first, joining `room.members` by `userId` only for nationality flag. Keep loading/error behavior non-destructive: do not fall back to a stale chat member list as the authority for kick eligibility.

- [ ] **Step 3: Wire existing UI and mutation**

Pass `isOwner`, `onRemove`, `disabled`, and an accessible remove label into the existing `ChatRoomMemberItem`. Store the selected participant; show the existing `ConfirmDialog` copy; call `useKickMember(meetingId)` only after confirm. While pending, disable both the target row action and `ConfirmDialog` through `confirmDisabled={kickMutation.isPending}`, and ignore dialog close/cancel requests so the target cannot change mid-flight. On success, close the dialog then clear the target; on error, retain target/dialog and surface the failure for retry or a later cancel. Never render the control for non-hosts, current user, or host target.

- [ ] **Step 4: Make cache/render state converge**

On kick success, invalidate the current `chatKeys.room(roomId)` in addition to existing meetup invalidation. On a system message received by a remaining user, invalidate room detail and participants so the count/rows are fresh even if that user did not initiate the kick. Do not optimistically remove before the server confirms.

- [ ] **Step 5: Run focused validation and commit**

```bash
pnpm lint
pnpm typecheck
```

```bash
git add src/features/chat/components/chat-room-page-content.tsx src/features/chat/components/chat-room-member-item.tsx src/features/meetup/hooks/use-meetup-queries.ts src/features/meetup/hooks/use-meetup-mutations.ts
git commit -m "모임 채팅방 회원관리 연결"
```

---

### Task 5: Handle active kicked-room removal through the existing user queue

**Files:**
- Modify: `src/features/chat/lib/chat-socket.ts`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`

**Interfaces:**
- Consumes: existing `WsRoomEvent { type: "remove", roomId }` from `/user/queue/rooms`.
- Produces: matching active room cache removal, panel closure, and `router.replace(routes.chats())` for the kicked user.
- Preserves: ordinary room topic delivery, user error subscription, and list-page socket behavior.

- [ ] **Step 1: Write a RED handler test/helper test**

Extract a small pure predicate for matching room-removal events if needed. Cover nonmatching remove, upsert, and matching remove. A matching remove must be the only path that triggers active-room cleanup/redirect.

- [ ] **Step 2: Extend `useChatRoomSocket` without another WebSocket client**

Add optional `onRoomEvent` to the active-room handlers and subscribe the same STOMP client to `/user/queue/rooms`. In the page, only a matching `remove` clears `chatKeys.room(roomId)` and `chatKeys.messages(roomId)`, closes more panel/dialogs, and replaces the route. This is necessary for host kick; self leave continues using its successful mutation route.

- [ ] **Step 3: Run focused validation and commit**

```bash
pnpm test:contracts
pnpm lint
pnpm typecheck
```

```bash
git add src/features/chat/lib/chat-socket.ts src/features/chat/components/chat-room-page-content.tsx
git commit -m "강퇴 채팅방 자동 이탈 처리"
```

---

### Task 6: Synchronize docs, verify, and hand off both PRs

**Files:**
- Modify: workspace `code/api/API-SPEC.md` (local cross-repo SSOT)
- Modify: FE/BE design and plan documents; local ignored `spec.md`/`memory.md`
- Modify: matching Notion API records after tests

**Interfaces:**
- Documents: group leave canonical route, existing kick endpoint, both system-message side effects, `messageType` in REST/summary/STOMP, host-only UI behavior, and active kicked-room redirect.

- [ ] **Step 1: Update local SSOT from verified code**

After backend and frontend behavior pass, update `code/api/API-SPEC.md` to preserve existing leave/kick status/error contracts while adding their common persisted/broadcast system side effect and additive `messageType` wire field. Record that group chat leave remains intentionally `409 GROUP_LEAVE_VIA_MEETING`.

- [ ] **Step 2: Reconcile Notion only after SSOT/tests agree**

Update the matching Notion API records (leave, kick, chat history, STOMP) with full fields, statuses, side effects, and FE consumption notes. Mark `변경여부=구현완료` only when code, tests, local SSOT, and Notion body are aligned. If the connector is unavailable, record the exact blocker in `memory.md` and both PR bodies instead of claiming sync.

- [ ] **Step 3: Run final frontend gates**

```bash
pnpm test:contracts
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:out
git diff --check
git status --short
```

- [ ] **Step 4: Run two-user browser smoke**

With a disposable/local environment and A(non-host), B(host):

1. A leaves from the panel and the list long-press path; network shows only `POST /meetings/{meetingId}/leave`.
2. B sees one dark-gray central system pill immediately; refresh/history keeps it, with no action chrome.
3. B sees host-first member list and removes A via existing confirmation; network shows only `POST /meetings/{meetingId}/kick`.
4. B's count/rows update; A's already-open room redirects to `/chats`; B sees the same neutral system pill and it persists after refresh.
5. Direct/question room leave remains the original chat endpoint and UI.

- [ ] **Step 5: Commit docs and prepare draft PR**

```bash
git add docs/superpowers/specs/2026-07-16-meeting-chat-leave-system-message-ui-design.md docs/superpowers/plans/2026-07-16-meeting-chat-leave-member-management.md
git commit -m "모임 채팅 이탈 UI 계약 문서화"
```

Create the FE draft PR against `develop`, link `Closes #171` and `rktclgh/ieum_BE#145`, include tests/smoke evidence and the backend-first rollout note. The backend PR must link back to FE #171.
