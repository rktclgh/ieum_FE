import assert from "node:assert/strict"
import test from "node:test"

import type { ChatReplyPreview } from "../api/chat-types"
import type { ChatBubbleMessage, ChatMessageView } from "./chat-adapter"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { canReplyToMessage, formatReplyLabel, matchesReplyTargetForEcho, replyTargetFromMessage, sameReplyTarget } from "./chat-reply.ts"

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
    ...overrides,
  }
}

const replyTarget: ChatReplyPreview = {
  messageId: 101,
  senderId: 44,
  senderNickname: "김연두",
  content: "떡볶이 먹을까?",
  imageUrl: null,
}

test("only another persisted user message can become a reply target", () => {
  const system: ChatMessageView = {
    messageType: "system",
    id: "102",
    messageId: 102,
    content: "김연두님이 모임을 떠났습니다",
    createdAt: "2026-07-16T08:22:00+09:00",
  }

  assert.equal(canReplyToMessage(userMessage()), true)
  assert.equal(canReplyToMessage(userMessage({ sender: "me" })), false)
  assert.equal(canReplyToMessage(userMessage({ pending: true })), false)
  assert.equal(canReplyToMessage(userMessage({ imageUploading: true })), false)
  assert.equal(canReplyToMessage(userMessage({ messageId: -1 })), false)
  assert.equal(canReplyToMessage(system), false)
})

test("reply target preserves text or image identity without synthesizing a nested reply", () => {
  assert.deepEqual(replyTargetFromMessage(userMessage()), replyTarget)
  assert.deepEqual(
    replyTargetFromMessage(userMessage({ texts: ["사진"], imageUrl: "https://cdn.example/reply.jpg" })),
    {
      ...replyTarget,
      content: null,
      imageUrl: "https://cdn.example/reply.jpg",
    }
  )
})

test("reply labels distinguish my reply from another member reply", () => {
  const labels = {
    mine: (targetName: string) => `${targetName}님에게 답장`,
    others: (senderName: string, targetName: string) => `${senderName}님이 ${targetName}님에게 답장`,
  }

  assert.equal(formatReplyLabel(userMessage({ sender: "me" }), replyTarget, labels), "김연두님에게 답장")
  assert.equal(formatReplyLabel(userMessage({ name: "wakawak" }), replyTarget, labels), "wakawak님이 김연두님에게 답장")
})

test("optimistic matching keeps ordinary and reply messages with the same text distinct", () => {
  const ordinary = userMessage({ sender: "me", replyTo: null })
  const reply = userMessage({ sender: "me", replyTo: replyTarget })

  assert.equal(sameReplyTarget(ordinary, ordinary), true)
  assert.equal(sameReplyTarget(reply, { ...reply, replyTo: { ...replyTarget } }), true)
  assert.equal(sameReplyTarget(ordinary, reply), false)
})

test("a rolling-deployment event without replyTo still replaces its pending message", () => {
  const reply = userMessage({ sender: "me", replyTo: replyTarget })

  assert.equal(matchesReplyTargetForEcho(reply, { replyTo: undefined }), true)
  assert.equal(matchesReplyTargetForEcho(reply, { replyTo: null }), false)
})
