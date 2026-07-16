import assert from "node:assert/strict"
import test from "node:test"

import type { ChatMessageView } from "./chat-adapter"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildChatTimeline, dedupeServerMessages, normalizeMessageType } from "./chat-timeline.ts"

const minuteKeyFor = (createdAt: string) => createdAt.slice(0, 16)

function userMessage(messageId: number, createdAt: string, senderId = 10): ChatMessageView {
  return {
    messageType: "user",
    id: String(messageId),
    messageId,
    senderId,
    sender: "others",
    variant: "short",
    name: "민지",
    texts: ["안녕하세요"],
    time: "오전 10:00",
    createdAt,
  }
}

function systemMessage(messageId: number, createdAt: string): ChatMessageView {
  return {
    messageType: "system",
    id: String(messageId),
    messageId,
    content: "민지님이 모임을 떠났습니다",
    createdAt,
  }
}

test("system message is a hard boundary between same-user same-minute messages", () => {
  const items = buildChatTimeline(
    [
      userMessage(1, "2026-07-16T10:00:01+09:00"),
      systemMessage(2, "2026-07-16T10:00:10+09:00"),
      userMessage(3, "2026-07-16T10:00:20+09:00"),
    ],
    minuteKeyFor
  )

  assert.deepEqual(items.map((item) => item.kind), ["user-run", "system", "user-run"])
  assert.equal(items.length, 3)
})

test("adjacent system messages remain distinct timeline items", () => {
  const items = buildChatTimeline(
    [
      systemMessage(1, "2026-07-16T10:00:01+09:00"),
      systemMessage(2, "2026-07-16T10:00:02+09:00"),
    ],
    minuteKeyFor
  )

  assert.deepEqual(items.map((item) => item.kind), ["system", "system"])
  assert.deepEqual(
    items.map((item) => (item.kind === "system" ? item.message.messageId : null)),
    [1, 2]
  )
})

test("a missing wire messageType normalizes to a user message", () => {
  assert.equal(normalizeMessageType(undefined), "user")
})

test("adjacent same-sender same-minute user messages share one run", () => {
  const items = buildChatTimeline(
    [
      userMessage(1, "2026-07-16T10:00:01+09:00"),
      userMessage(2, "2026-07-16T10:00:49+09:00"),
    ],
    minuteKeyFor
  )

  assert.equal(items.length, 1)
  assert.equal(items[0]?.kind, "user-run")
  if (items[0]?.kind === "user-run") {
    assert.deepEqual(items[0].messages.map((message) => message.messageId), [1, 2])
  }
})

test("REST and WebSocket duplicates remain deduped by messageId before timeline building", () => {
  const rest = userMessage(1, "2026-07-16T10:00:01+09:00")
  const websocketEcho = { ...rest, time: "오전 10:01" }

  const merged = dedupeServerMessages([rest, websocketEcho])

  assert.equal(merged.length, 1)
  assert.equal(merged[0]?.messageType, "user")
  if (merged[0]?.messageType === "user") {
    assert.equal(merged[0].time, "오전 10:01")
  }
})
