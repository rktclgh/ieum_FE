# Chat Room Avatar Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the correct representative image for each chat room type and preserve every message sender's profile image, including after that sender leaves the room.

**Architecture:** The backend adds one nullable `senderProfileImageUrl` field to the canonical REST and STOMP message contracts. The frontend selects room-level images from the room type and consumes the message-level field for message avatars, avoiding profile lookups per message and avoiding dependence on active membership.

**Tech Stack:** Spring Boot records/Jackson/STOMP, Next.js 16, React, TanStack Query, TypeScript, Node test runner, Gradle/JUnit.

## Global Constraints

- `direct` representative image is the counterpart profile image.
- `group` representative image is the meeting image only; no participant-profile fallback.
- `question` detail-panel image retains the existing question-image behavior.
- `senderProfileImageUrl` is nullable and represents the sender's current profile, not a database snapshot.
- No schema migration or per-message profile fetch is allowed.
- All file URLs are normalized through the existing `resolveFileUrl` boundary.

---

### Task 1: Freeze the message avatar API contract

**Files:**
- Modify: `../ieum_be/app-main/src/main/java/shinhan/fibri/ieum/main/chat/dto/ChatMessageResponse.java`
- Modify: `../ieum_be/app-main/src/main/java/shinhan/fibri/ieum/main/chat/service/WsMessageEvent.java`
- Modify: `../ieum_be/app-main/src/main/java/shinhan/fibri/ieum/main/chat/service/ChatMessageService.java`
- Test: `../ieum_be/app-main/src/test/java/shinhan/fibri/ieum/main/chat/service/ChatMessageServiceTest.java`
- Test: `../ieum_be/app-main/src/test/java/shinhan/fibri/ieum/main/chat/controller/ChatControllerTest.java`
- Test: `../ieum_be/app-main/src/test/java/shinhan/fibri/ieum/main/chat/websocket/ChatWebSocketIntegrationTest.java`

**Consumes:** `Message.sender`, `ProfileImageUrls.of(User)`.

**Produces:** Identical nullable `senderProfileImageUrl` in REST message payloads, nested room-list `lastMessage`, and STOMP room events.

- [ ] **Step 1: Write a failing service regression test**

  Link a known UUID profile file to the sender in `sendSavesMessageAndPublishesEventWhenNoTransactionSynchronization`. Assert both the returned `ChatMessageResponse` and captured `WsMessageEvent` expose `/api/v1/files/{uuid}`.

- [ ] **Step 2: Verify the regression test fails**

  Run:

  ```bash
  ./gradlew :app-main:test --tests shinhan.fibri.ieum.main.chat.service.ChatMessageServiceTest
  ```

  Expected: compilation fails because neither message record exposes `senderProfileImageUrl`.

- [ ] **Step 3: Add the canonical DTO field**

  Add `String senderProfileImageUrl` immediately after `senderNickname` in `ChatMessageResponse`; populate it with `ProfileImageUrls.of(message.getSender())`. Add the same field in `WsMessageEvent` and copy it from the DTO in `ChatMessageService.toEvent`.

- [ ] **Step 4: Lock REST and STOMP wire names**

  In `ChatControllerTest`, construct a message with a fixed URL and assert `$.items[0].senderProfileImageUrl`. In `ChatWebSocketIntegrationTest`, publish an event with the same fixed URL and assert the subscribed event has it.

- [ ] **Step 5: Verify backend contract**

  Run:

  ```bash
  ./gradlew :app-main:test --tests shinhan.fibri.ieum.main.chat.service.ChatMessageServiceTest --tests shinhan.fibri.ieum.main.chat.controller.ChatControllerTest --tests shinhan.fibri.ieum.main.chat.websocket.ChatWebSocketIntegrationTest
  ```

  Expected: all selected tests pass; no migration is created.

- [ ] **Step 6: Commit the backend contract separately**

  ```bash
  git add app-main/src/main/java/shinhan/fibri/ieum/main/chat app-main/src/test/java/shinhan/fibri/ieum/main/chat docs/superpowers/specs/2026-07-16-chat-message-sender-avatar-contract.md
  git commit -m "fix: 채팅 메시지 발신자 프로필 URL 제공"
  ```

### Task 2: Select a room-level representative image by room type

**Files:**
- Create: `src/features/chat/lib/chat-avatar.ts`
- Modify: `src/features/chat/lib/chat-adapter.ts`
- Modify: `src/features/chat/hooks/use-chat-queries.ts`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`
- Test: `scripts/ci/test-chat-avatar.ts`
- Test runner: `scripts/ci/test-chat-avatar-contracts.sh`
- Test runner: `scripts/ci/test-client-contracts.sh`

**Consumes:** `roomType`, active room members, `MeetingDetailResponse.imageUrl`, question summary image.

**Produces:** A normalized `avatarSrc` for chat lists and the detail-panel top profile.

- [ ] **Step 1: Write failing selector tests**

  Cover four cases in `test-chat-avatar.ts`: direct returns the counterpart URL; group returns the provided meeting URL; group with no meeting URL returns `undefined`; question falls back to the counterpart URL for the list flow.

- [ ] **Step 2: Verify selector tests fail**

  Run:

  ```bash
  bash scripts/ci/test-chat-avatar-contracts.sh
  ```

  Expected: compilation fails before the `chat-avatar` module exists.

- [ ] **Step 3: Add the minimal selector**

  Implement `resolveChatRoomAvatar(roomType, members, myUserId, meetingAvatarSrc)`. Return `meetingAvatarSrc` for `group`; otherwise select the member whose `userId` differs from `myUserId`.

- [ ] **Step 4: Connect list and detail-panel data**

  Pass `MeetingDetailResponse.imageUrl` through `useChatRoomsView` to `adaptRoomSummary`, normalizing in `chat-adapter.ts`. In `chat-room-page-content.tsx`, keep `questionSummary.imageUrl` for question rooms and use the selector for direct/group rooms.

- [ ] **Step 5: Verify selector tests pass**

  Run:

  ```bash
  bash scripts/ci/test-chat-avatar-contracts.sh
  ```

  Expected: five avatar-selection assertions pass.

### Task 3: Render message avatars from the message contract

**Files:**
- Modify: `src/features/chat/api/chat-types.ts`
- Modify: `src/features/chat/lib/chat-adapter.ts`
- Modify: `src/features/chat/components/chat-room-page-content.tsx`
- Test: `scripts/ci/test-chat-avatar.ts`

**Consumes:** REST and STOMP `senderProfileImageUrl` from Task 1.

**Produces:** `ChatBubbleMessage.avatarSrc`, preserved in `ChatMessageRun` and passed into `ChatMessageGroup`.

- [ ] **Step 1: Extend the frontend message contract**

  Add `senderProfileImageUrl: string | null` to both `ChatMessageResponse` and `WsMessageEvent` at the same field position as the backend contract.

- [ ] **Step 2: Normalize once in `adaptMessage`**

  Add `avatarSrc: resolveFileUrl(message.senderProfileImageUrl)` to `ChatBubbleMessage`. Copy this value when `buildMessageRuns` creates a new run.

- [ ] **Step 3: Render the run avatar directly**

  Pass `run.avatarSrc` to `ChatMessageGroup`. Do not resolve through `roomMembers`, because inactive senders are intentionally absent from room detail responses.

- [ ] **Step 4: Verify all frontend contracts and build outputs**

  Run:

  ```bash
  pnpm test:contracts
  pnpm lint
  pnpm typecheck
  pnpm exec next build --webpack
  pnpm verify:out
  ```

  Expected: all commands exit 0. `--webpack` is the validated fallback when the local Turbopack build process does not complete.

- [ ] **Step 5: Commit the frontend implementation separately**

  ```bash
  git add src/features/chat scripts/ci docs/superpowers/specs/2026-07-16-chat-room-avatar-rendering-design.md docs/superpowers/plans/2026-07-16-chat-room-avatar-rendering.md
  git commit -m "fix: 채팅방 유형별 대표 이미지 렌더링"
  ```

## Final Review Gate

- [ ] Compare both branches with `develop` and confirm the API field has the same name in Java records and TypeScript interfaces.
- [ ] Confirm no schema migration or new endpoint exists.
- [ ] Confirm direct/group/question fallbacks match the design table.
- [ ] Run a fresh code review after all tests pass.
- [ ] Push both branches and open Ready PRs targeting `develop`, each referencing `rktclgh/ieum_FE#169`.
