import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveChatRoomAvatar,
} from "../../src/features/chat/lib/chat-avatar"

const members = [
  { userId: 10, avatarSrc: "/api/v1/files/me" },
  { userId: 20, avatarSrc: "/api/v1/files/other" },
]

test("direct chat uses the conversation counterpart profile", () => {
  assert.equal(resolveChatRoomAvatar("direct", members, 10), "/api/v1/files/other")
})

test("group chat uses its meeting image instead of a participant profile", () => {
  assert.equal(
    resolveChatRoomAvatar("group", members, 10, "/api/v1/files/meeting"),
    "/api/v1/files/meeting",
  )
})

test("group chat without a meeting image keeps the empty-avatar fallback", () => {
  assert.equal(resolveChatRoomAvatar("group", members, 10), undefined)
})

test("question chat keeps the counterpart profile fallback", () => {
  assert.equal(resolveChatRoomAvatar("question", members, 10), "/api/v1/files/other")
})

test("direct chat without a counterpart keeps the empty-avatar fallback", () => {
  assert.equal(resolveChatRoomAvatar("direct", [{ userId: 10, avatarSrc: "/api/v1/files/me" }], 10), undefined)
})
