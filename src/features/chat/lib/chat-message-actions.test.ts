import assert from "node:assert/strict"
import test from "node:test"

import type { ChatBubbleMessage, ChatMessageView } from "./chat-adapter"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { canReportMessage, canTranslateMessage } from "./chat-message-actions.ts"

function userMessage(overrides: Partial<ChatBubbleMessage> = {}): ChatBubbleMessage {
  return {
    messageType: "user",
    id: "101",
    messageId: 101,
    senderId: 44,
    sender: "others",
    variant: "short",
    name: "김연두",
    texts: ["떡볶이 먹을까?"],
    time: "오전 8:21",
    createdAt: "2026-07-16T08:21:00+09:00",
    hasText: true,
    ...overrides,
  }
}

const systemMessage: ChatMessageView = {
  messageType: "system",
  id: "102",
  messageId: 102,
  content: "김연두님이 모임을 떠났습니다",
  createdAt: "2026-07-16T08:22:00+09:00",
}

test("내가 보낸 메시지는 신고 대상이 아니다", () => {
  assert.equal(canReportMessage(userMessage()), true)
  assert.equal(canReportMessage(userMessage({ sender: "me" })), false)
})

test("시스템 메시지는 신고 대상이 아니다", () => {
  assert.equal(canReportMessage(systemMessage), false)
})

test("내가 보낸 메시지는 번역 대상이 아니다", () => {
  assert.equal(canTranslateMessage(userMessage(), { isAuthenticated: true }), true)
  assert.equal(canTranslateMessage(userMessage({ sender: "me" }), { isAuthenticated: true }), false)
})

test("비로그인·전송중·텍스트 없는 메시지는 번역 대상이 아니다", () => {
  assert.equal(canTranslateMessage(userMessage(), { isAuthenticated: false }), false)
  assert.equal(canTranslateMessage(userMessage({ pending: true }), { isAuthenticated: true }), false)
  assert.equal(
    canTranslateMessage(userMessage({ hasText: false, texts: [] }), { isAuthenticated: true }),
    false
  )
})
