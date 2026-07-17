import assert from "node:assert/strict"
import test from "node:test"

import type { ChatReplyPreview } from "../api/chat-types"
import type { ChatBubbleMessage, ChatMessageView } from "./chat-adapter"
// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { canReplyToMessage, findConfirmedReplyPendingFromHistory, findPendingEchoMatch, formatReplyLabel, hasUnconfirmedReplyPendingForEcho, matchesReplyTargetForEcho, replyTargetFromMessage, sameReplyTarget, shouldClearDraftAfterAcceptedEcho, shouldClearSelectedReplyAfterAcceptedEcho } from "./chat-reply.ts"

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

test("an event that omits replyTo cannot wildcard-match a pending reply", () => {
  const reply = userMessage({ sender: "me", replyTo: replyTarget })

  assert.equal(matchesReplyTargetForEcho(reply, { replyTo: undefined }), false)
  assert.equal(matchesReplyTargetForEcho(reply, { replyTo: null }), false)
})

test("an old-field echo waits for REST backfill when ordinary and reply candidates are ambiguous", () => {
  const createdAt = "2026-07-16T08:21:00+09:00"
  const ordinary = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: null,
    createdAt,
  })
  const reply = userMessage({
    id: "pending--2",
    messageId: -2,
    sender: "me",
    pending: true,
    replyTo: replyTarget,
    createdAt,
  })
  const oldFieldEcho = userMessage({
    id: "301",
    messageId: 301,
    sender: "me",
    replyTo: undefined,
    createdAt: "2026-07-16T08:21:30+09:00",
  })

  assert.equal(findPendingEchoMatch([ordinary, reply], oldFieldEcho, 60_000), undefined)
})

test("an old-field echo never confirms a reply pending message", () => {
  const pending = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: replyTarget,
    createdAt: "2026-07-16T08:21:00+09:00",
  })
  const inWindow = userMessage({
    id: "302",
    messageId: 302,
    sender: "me",
    replyTo: undefined,
    createdAt: "2026-07-16T08:21:59+09:00",
  })
  const outsideWindow = { ...inWindow, messageId: 303, createdAt: "2026-07-16T08:22:01+09:00" }

  assert.equal(findPendingEchoMatch([pending], inWindow, 60_000), undefined)
  assert.equal(findPendingEchoMatch([pending], outsideWindow, 60_000), undefined)
  assert.equal(hasUnconfirmedReplyPendingForEcho([pending], inWindow, 60_000), true)
  assert.equal(hasUnconfirmedReplyPendingForEcho([pending], outsideWindow, 60_000), false)
})

test("a unique old-field echo can still confirm an ordinary pending message", () => {
  const pending = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: null,
    createdAt: "2026-07-16T08:21:00+09:00",
  })
  const oldFieldEcho = userMessage({
    id: "303",
    messageId: 303,
    sender: "me",
    replyTo: undefined,
    createdAt: "2026-07-16T08:21:30+09:00",
  })

  assert.equal(findPendingEchoMatch([pending], oldFieldEcho, 60_000), pending)
})

test("a reply-aware echo selects its matching reply pending message", () => {
  const createdAt = "2026-07-16T08:21:00+09:00"
  const ordinary = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: null,
    createdAt,
  })
  const reply = userMessage({
    id: "pending--2",
    messageId: -2,
    sender: "me",
    pending: true,
    replyTo: replyTarget,
    createdAt,
  })
  const replyEcho = userMessage({
    id: "304",
    messageId: 304,
    sender: "me",
    replyTo: replyTarget,
    createdAt: "2026-07-16T08:21:30+09:00",
  })

  assert.equal(findPendingEchoMatch([ordinary, reply], replyEcho, 60_000), reply)
})

test("a REST-confirmed reply clears the matching pending target and sent draft", () => {
  const pending = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: replyTarget,
    createdAt: "2026-07-16T08:21:00+09:00",
  })
  const historyMessage = userMessage({
    id: "305",
    messageId: 305,
    sender: "me",
    replyTo: replyTarget,
    createdAt: "2026-07-16T08:21:30+09:00",
  })

  const matched = findConfirmedReplyPendingFromHistory([pending], [historyMessage], 60_000)

  assert.equal(matched, pending)
  assert.equal(shouldClearSelectedReplyAfterAcceptedEcho(replyTarget, matched), true)
  assert.equal(shouldClearDraftAfterAcceptedEcho("떡볶이 먹을까?", matched), true)
})

test("only an accepted matching reply echo clears its selected target and unchanged text draft", () => {
  const replyPending = userMessage({
    id: "pending--1",
    messageId: -1,
    sender: "me",
    pending: true,
    replyTo: replyTarget,
  })
  const anotherReply: ChatReplyPreview = { ...replyTarget, messageId: 102 }

  assert.equal(shouldClearSelectedReplyAfterAcceptedEcho(replyTarget, replyPending), true)
  assert.equal(shouldClearSelectedReplyAfterAcceptedEcho(anotherReply, replyPending), false)
  assert.equal(shouldClearDraftAfterAcceptedEcho("떡볶이 먹을까?", replyPending), true)
  assert.equal(shouldClearDraftAfterAcceptedEcho("새 초안", replyPending), false)
})
