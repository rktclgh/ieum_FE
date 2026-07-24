import assert from "node:assert/strict"
import test from "node:test"
import { QueryClient } from "@tanstack/react-query"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { beginRoomReadGeneration, isActiveRoomRemoval, isLatestRoomReadGeneration, markRoomReadInLoadedListCaches, prepareMarkRoomReadCache, removeRoomFromAllLoadedListCaches, restoreMarkRoomReadCache } from "./chat-room-event.ts"

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

test("marking a room read synchronously clears only that room unread count in loaded room-list caches", () => {
  const queryClient = new QueryClient()
  const roomsListKey = ["chat", "rooms"] as const
  queryClient.setQueryData([...roomsListKey, "all"], [
    { ...roomSummary(11), unreadCount: 4 },
    { ...roomSummary(12), unreadCount: 2 },
  ])
  queryClient.setQueryData([...roomsListKey, "group"], [{ ...roomSummary(11), unreadCount: 4 }])
  queryClient.setQueryData([...roomsListKey, "direct"], [{ ...roomSummary(21), unreadCount: 9 }])
  queryClient.setQueryData(["chat", "room", 11], { roomId: 11, unreadCount: 4 })

  markRoomReadInLoadedListCaches(queryClient, roomsListKey, 11)

  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "all"]), [
    { ...roomSummary(11), unreadCount: 0 },
    { ...roomSummary(12), unreadCount: 2 },
  ])
  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "group"]), [
    { ...roomSummary(11), unreadCount: 0 },
  ])
  assert.deepEqual(queryClient.getQueryData([...roomsListKey, "direct"]), [
    { ...roomSummary(21), unreadCount: 9 },
  ])
  assert.deepEqual(queryClient.getQueryData(["chat", "room", 11]), { roomId: 11, unreadCount: 4 })
})

test("preparing a room read waits for room-list query cancellation before patching and can restore on error", async () => {
  const queryClient = new QueryClient()
  const roomsListKey = ["chat", "rooms"] as const
  const allRoomsKey = [...roomsListKey, "all"] as const
  queryClient.setQueryData(allRoomsKey, [
    { ...roomSummary(11), unreadCount: 4 },
    { ...roomSummary(12), unreadCount: 2 },
  ])

  let resolveCancel!: () => void
  let cancelCalled = false
  const originalCancelQueries = queryClient.cancelQueries.bind(queryClient)
  queryClient.cancelQueries = async (filters, options) => {
    cancelCalled = true
    assert.deepEqual(filters, { queryKey: roomsListKey })
    await new Promise<void>((resolve) => {
      resolveCancel = resolve
    })
    return originalCancelQueries(filters, options)
  }

  const prepared = prepareMarkRoomReadCache(queryClient, roomsListKey, 11)

  assert.equal(cancelCalled, true)
  assert.deepEqual(queryClient.getQueryData(allRoomsKey), [
    { ...roomSummary(11), unreadCount: 4 },
    { ...roomSummary(12), unreadCount: 2 },
  ])

  resolveCancel()
  const snapshot = await prepared

  assert.deepEqual(queryClient.getQueryData(allRoomsKey), [
    { ...roomSummary(11), unreadCount: 0 },
    { ...roomSummary(12), unreadCount: 2 },
  ])

  restoreMarkRoomReadCache(queryClient, snapshot)

  assert.deepEqual(queryClient.getQueryData(allRoomsKey), [
    { ...roomSummary(11), unreadCount: 4 },
    { ...roomSummary(12), unreadCount: 2 },
  ])
})

test("an older failed room read generation cannot restore after a newer read intent for the same room", () => {
  const generations = new Map<number, number>()
  const older = beginRoomReadGeneration(generations, 11)
  const otherRoom = beginRoomReadGeneration(generations, 12)
  const newer = beginRoomReadGeneration(generations, 11)

  assert.equal(isLatestRoomReadGeneration(generations, older), false)
  assert.equal(isLatestRoomReadGeneration(generations, newer), true)
  assert.equal(isLatestRoomReadGeneration(generations, otherRoom), true)
})
