import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveChatRoomAvatars,
} from "../../src/features/chat/lib/chat-avatar"

const members = [
  { userId: 10, avatarSrc: "/api/v1/files/me" },
  { userId: 20, avatarSrc: "/api/v1/files/other" },
]

const groupMembers = [
  { userId: 10, avatarSrc: "/api/v1/files/me" },
  { userId: 20, avatarSrc: "/api/v1/files/a" },
  { userId: 30, avatarSrc: "/api/v1/files/b" },
]

test("direct chat uses the conversation counterpart profile", () => {
  const avatars = resolveChatRoomAvatars("direct", members, 10)
  assert.equal(avatars.avatarSrc, "/api/v1/files/other")
  assert.equal(avatars.grouped, false)
  assert.equal(avatars.secondaryAvatarSrc, undefined)
})

test("group chat uses its meeting image instead of a participant profile", () => {
  const avatars = resolveChatRoomAvatars("group", members, 10, "/api/v1/files/meeting")
  assert.equal(avatars.avatarSrc, "/api/v1/files/meeting")
  assert.equal(avatars.grouped, false)
})

test("group chat without a meeting image keeps the empty-avatar fallback", () => {
  const avatars = resolveChatRoomAvatars("group", members, 10)
  assert.equal(avatars.avatarSrc, undefined)
  assert.equal(avatars.grouped, false)
})

test("question chat keeps the counterpart profile fallback", () => {
  const avatars = resolveChatRoomAvatars("question", members, 10)
  assert.equal(avatars.avatarSrc, "/api/v1/files/other")
  assert.equal(avatars.grouped, false)
})

test("direct and question chats keep a departed counterpart profile", () => {
  const departedCounterpart = { userId: 20, avatarSrc: "/api/v1/files/departed" }
  const onlyMe = [{ userId: 10, avatarSrc: "/api/v1/files/me" }]

  assert.equal(
    resolveChatRoomAvatars("direct", onlyMe, 10, undefined, departedCounterpart).avatarSrc,
    "/api/v1/files/departed",
  )
  assert.equal(
    resolveChatRoomAvatars("question", onlyMe, 10, undefined, departedCounterpart).avatarSrc,
    "/api/v1/files/departed",
  )
})

test("direct chat without a counterpart keeps the empty-avatar fallback", () => {
  const avatars = resolveChatRoomAvatars("direct", [{ userId: 10, avatarSrc: "/api/v1/files/me" }], 10)
  assert.equal(avatars.avatarSrc, undefined)
  assert.equal(avatars.grouped, false)
})

test("a room with 3+ members overlaps the first two other members' profiles", () => {
  const avatars = resolveChatRoomAvatars("group", groupMembers, 10, "/api/v1/files/meeting")
  assert.equal(avatars.grouped, true)
  assert.equal(avatars.avatarSrc, "/api/v1/files/a")
  assert.equal(avatars.secondaryAvatarSrc, "/api/v1/files/b")
})

test("3+ members overlap regardless of room type (question)", () => {
  const avatars = resolveChatRoomAvatars("question", groupMembers, 10)
  assert.equal(avatars.grouped, true)
  assert.equal(avatars.avatarSrc, "/api/v1/files/a")
  assert.equal(avatars.secondaryAvatarSrc, "/api/v1/files/b")
})

test("3+ members stay grouped even when the second member has no profile image", () => {
  const withoutSecondAvatar = [
    { userId: 10, avatarSrc: "/api/v1/files/me" },
    { userId: 20, avatarSrc: "/api/v1/files/a" },
    { userId: 30 },
  ]
  const avatars = resolveChatRoomAvatars("group", withoutSecondAvatar, 10, "/api/v1/files/meeting")
  assert.equal(avatars.grouped, true)
  assert.equal(avatars.avatarSrc, "/api/v1/files/a")
  assert.equal(avatars.secondaryAvatarSrc, undefined)
})
