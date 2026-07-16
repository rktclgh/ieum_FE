import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { GroupRoomMeetingLinkError, resolveLeaveChatRoomAction } from "./chat-leave.ts"

test("direct rooms choose the existing chat-room leave route", () => {
  const action = resolveLeaveChatRoomAction({
    roomId: 11,
    roomType: "direct",
    meetingId: null,
  })

  assert.deepEqual(action, { kind: "chat-room", roomId: 11 })
})

test("question rooms choose the existing chat-room leave route", () => {
  const action = resolveLeaveChatRoomAction({
    roomId: 12,
    roomType: "question",
    meetingId: null,
  })

  assert.deepEqual(action, { kind: "chat-room", roomId: 12 })
})

test("group rooms with a meeting link choose the meeting leave route", () => {
  const action = resolveLeaveChatRoomAction({
    roomId: 13,
    roomType: "group",
    meetingId: 42,
  })

  assert.deepEqual(action, { kind: "meeting", roomId: 13, meetingId: 42 })
})

test("a group room without a valid meeting link cannot choose the chat-room leave route", () => {
  assert.throws(
    () => resolveLeaveChatRoomAction({ roomId: 14, roomType: "group", meetingId: null }),
    (error: unknown) => {
      assert.ok(error instanceof GroupRoomMeetingLinkError)
      assert.equal(error.code, "GROUP_ROOM_MEETING_LINK_MISSING")
      return true
    }
  )
})

test("a group room with a non-positive meeting link cannot choose the chat-room leave route", () => {
  assert.throws(
    () => resolveLeaveChatRoomAction({ roomId: 15, roomType: "group", meetingId: 0 }),
    GroupRoomMeetingLinkError
  )
})
