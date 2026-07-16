# 채팅 답장 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 타인의 user message를 길게 눌러 답장을 선택하고, composer preview와 낮은 대비의 원문 quote를 가진 text/image 답장을 보낼 수 있게 한다.

**Architecture:** frontend keeps only a selected flat reply preview and passes `replyToMessageId` through the existing send transport. API/WS adapters normalize optional reply data; pure helpers own menu eligibility, labels, and optimistic-message equivalence so rendering does not duplicate policy.

**Tech Stack:** Next.js/React, TypeScript, existing chat context menu/input/bubble components, Tailwind design tokens, Node/TypeScript module tests.

## Guardrails

- 이 워크트리 밖의 files와 backend validation policy를 변경하지 않는다.
- Production chat path is `ChatMessageGroup`/`MessageRow`/`ChatBubbleSegment`; do not revive the unused legacy bubble component.
- Reply is one-level preview only: no thread, jump, nested reply, reaction, or reply edit/delete.
- Long-press eligibility excludes self, system, pending, and uploading messages. Failed sends retain the selected target for retry.
- Run pure module tests plus affected typecheck/lint; do not add broad browser suites.

## File map

| Area | Primary files |
| --- | --- |
| Wire/view model | `src/features/chat/api/chat-types.ts`, `src/features/chat/lib/chat-adapter.ts` |
| Pure policy | `src/features/chat/lib/chat-reply.ts` and `chat-reply.test.ts` |
| UI orchestration | `src/features/chat/components/chat-room-page-content.tsx`, `chat-message-input.tsx`, `chat-bubble-segment.tsx`, `chat-context-menu.tsx` |
| Copy/assets | `src/lib/i18n/messages/*`, existing `respond.svg` asset |

## Implementation tasks

- [ ] **Task 1 — Establish reply types and pure policy with tests.**
  - Add optional `replyTo` preview to REST/WS types and optional `replyToMessageId` to the send request; adapter must normalize omitted server fields safely.
  - Implement and test pure eligibility, own/other label selection, image/text preview selection, and optimistic-match comparison including `replyToMessageId`.
  - Keep `ChatSystemMessage` separate from user bubbles and prevent reply policy from treating it as a target.

- [ ] **Task 2 — Integrate selection into the existing long-press/send path.**
  - Add reply action to the existing context menu only when pure eligibility passes.
  - Store selected reply in `chat-room-page-content`, preserve it on failed text/image sends, clear it only after an accepted send/echo, and keep input text when cancelled.
  - Include target ID in text and image payloads and in pending optimistic message identity.

- [ ] **Task 3 — Render composer and message quote with existing design tokens.**
  - Extend `ChatMessageInput` with a compact selected-target banner using `respond.svg`, target nickname, one-line preview, and a 44px cancel control while preserving focus/safe-area behavior.
  - Extend the current `ChatBubbleSegment` composition with the small sender-to-target label and `bg-gray-200` quote before the normal bubble; retain existing avatar/time/group logic.
  - Use image indicator/thumbnail behavior for image-only parent previews without adding enlargement or navigation.

- [ ] **Task 4 — Complete locale copy and focused verification.**
  - Add grammatical label templates and cancel/preview copy to all supported locale message shapes; use templates rather than string concatenation.
  - Run `chat-reply.test.ts`, adapter-related focused tests, `pnpm typecheck`, and targeted lint/build checks.
  - Verify a reply and ordinary same-text message do not replace each other's optimistic bubbles.

## Acceptance checklist

- [ ] Long press exposes reply only for another user's persisted user message.
- [ ] Composer target can be cancelled without losing draft text and survives a send failure.
- [ ] Text/image replies emit target ID and render a single gray quote across history and WS updates.
- [ ] Optimistic reconciliation distinguishes ordinary and reply messages with identical text.
- [ ] Existing chat design system and message grouping behavior remain intact.

