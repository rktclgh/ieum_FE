import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { isActiveRoomRemoval } from "./chat-room-event.ts"

test("an upsert cannot remove the active room", () => {
  assert.equal(
    isActiveRoomRemoval(
      {
        type: "upsert",
        room: {
          roomId: 11,
          roomType: "group",
          meetingId: 7,
          questionId: null,
          pinned: false,
          notifyEnabled: true,
          unreadCount: 0,
          lastMessage: null,
        },
      },
      11
    ),
    false
  )
})

test("a remove event for another room cannot remove the active room", () => {
  assert.equal(isActiveRoomRemoval({ type: "remove", roomId: 12 }, 11), false)
})

test("only a matching remove event removes the active room", () => {
  assert.equal(isActiveRoomRemoval({ type: "remove", roomId: 11 }, 11), true)
})
