import assert from "node:assert/strict"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { isActiveRoomRemoval, removeRoomFromAllLoadedListCaches } from "./chat-room-event.ts"

function roomSummary(roomId: number) {
  return {
    roomId,
    roomType: "group" as const,
    meetingId: 7,
    questionId: null,
    pinned: false,
    notifyEnabled: true,
    unreadCount: 0,
    lastMessage: null,
  }
}

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

test("a room removal synchronously strips that room from every loaded room-list cache", () => {
  const queryClient = new QueryClient()
  const roomsListKey = ["chat", "rooms"] as const
  queryClient.setQueryData([...roomsListKey, "all"], [roomSummary(11), roomSummary(12)])
  queryClient.setQueryData([...roomsListKey, "group"], [roomSummary(11)])
  queryClient.setQueryData([...roomsListKey, "direct"], [roomSummary(21)])
  queryClient.setQueryData(["chat", "room", 11], { roomId: 11 })

  removeRoomFromAllLoadedListCaches(queryClient, roomsListKey, 11)

  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "all"]), [roomSummary(12)])
  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "group"]), [])
  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "direct"]), [roomSummary(21)])
  assert.deepEqual(queryClient.getQueryData(["chat", "room", 11]), { roomId: 11 })
})
