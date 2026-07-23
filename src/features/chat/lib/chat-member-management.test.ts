import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildGroupChatMemberList } from "./chat-member-management.ts"

test("participant API is the member-list SSOT while chat metadata only enriches nationality", () => {
  const members = buildGroupChatMemberList({
    currentUserId: 10,
    participants: [
      {
        userId: 20,
        nickname: "참가자",
        profileImageUrl: "/api/v1/files/participant",
        isHost: false,
        joinedAt: "2026-07-16T10:00:00+09:00",
      },
      {
        userId: 10,
        nickname: "방장",
        profileImageUrl: "/api/v1/files/host",
        isHost: true,
        joinedAt: "2026-07-16T09:00:00+09:00",
      },
      {
        userId: 30,
        nickname: "메타데이터 없는 참가자",
        profileImageUrl: null,
        isHost: false,
        joinedAt: "2026-07-16T11:00:00+09:00",
      },
    ],
    roomMembers: [
      {
        userId: 20,
        name: "오래된 채팅 닉네임",
        avatarSrc: "/api/v1/files/stale",
        isMe: false,
        nationalityCode: "south-korea",
      },
    ],
  })

  assert.deepEqual(
    members.map((member) => member.userId),
    [10, 20, 30]
  )
  assert.deepEqual(members[1], {
    userId: 20,
    name: "참가자",
    profileImageUrl: "/api/v1/files/participant",
    isMe: false,
    isOwner: false,
    nationalityCode: "south-korea",
    canRemove: true,
  })
  assert.equal(members[2]?.name, "메타데이터 없는 참가자")
  assert.equal(members[2]?.nationalityCode, undefined)
})

test("non-host current user still ranks above the host, then the rest sort by join time", () => {
  const members = buildGroupChatMemberList({
    currentUserId: 20,
    participants: [
      { userId: 10, nickname: "방장", profileImageUrl: null, isHost: true, joinedAt: "2026-07-16T09:00:00+09:00" },
      { userId: 20, nickname: "나", profileImageUrl: null, isHost: false, joinedAt: "2026-07-16T12:00:00+09:00" },
      {
        userId: 30,
        nickname: "먼저 온 참가자",
        profileImageUrl: null,
        isHost: false,
        joinedAt: "2026-07-16T10:00:00+09:00",
      },
      {
        userId: 40,
        nickname: "나중 온 참가자",
        profileImageUrl: null,
        isHost: false,
        joinedAt: "2026-07-16T11:00:00+09:00",
      },
    ],
    roomMembers: [],
  })

  assert.deepEqual(
    members.map((member) => member.userId),
    [20, 10, 30, 40]
  )
})

test("only the current host can remove another non-host participant", () => {
  const byUserId = new Map(
    buildGroupChatMemberList({
      currentUserId: 10,
      participants: [
        { userId: 10, nickname: "방장", profileImageUrl: null, isHost: true, joinedAt: "2026-07-16T09:00:00+09:00" },
        { userId: 20, nickname: "참가자", profileImageUrl: null, isHost: false, joinedAt: "2026-07-16T10:00:00+09:00" },
      ],
      roomMembers: [],
    }).map((member) => [member.userId, member])
  )

  assert.equal(byUserId.get(10)?.canRemove, false)
  assert.equal(byUserId.get(20)?.canRemove, true)

  const nonHostMembers = buildGroupChatMemberList({
    currentUserId: 20,
    participants: [
      { userId: 10, nickname: "방장", profileImageUrl: null, isHost: true, joinedAt: "2026-07-16T09:00:00+09:00" },
      { userId: 20, nickname: "참가자", profileImageUrl: null, isHost: false, joinedAt: "2026-07-16T10:00:00+09:00" },
    ],
    roomMembers: [],
  })

  assert.equal(nonHostMembers.every((member) => !member.canRemove), true)
})
