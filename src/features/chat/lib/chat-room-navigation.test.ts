import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { parseChatRoomEntry, navigateChatRoomBack } from "./chat-room-navigation.ts"

test("replaces a direct chat-room entry with the chat list regardless of browser history", () => {
  const calls: string[] = []

  navigateChatRoomBack(parseChatRoomEntry(null), {
    back: () => calls.push("back"),
    replace: (href) => calls.push(`replace:${href}`),
  })

  assert.deepEqual(calls, ["replace:/chats/"])
})

test("preserves browser back navigation after an explicit in-app room entry with usable history", () => {
  const calls: string[] = []

  navigateChatRoomBack(
    parseChatRoomEntry("app"),
    {
      back: () => calls.push("back"),
      replace: (href) => calls.push(`replace:${href}`),
    },
    () => true
  )

  assert.deepEqual(calls, ["back"])
})

test("falls back to the chat list for an app-marked deep link without browser history", () => {
  const calls: string[] = []

  navigateChatRoomBack(
    parseChatRoomEntry("app"),
    {
      back: () => calls.push("back"),
      replace: (href) => calls.push(`replace:${href}`),
    },
    () => false
  )

  assert.deepEqual(calls, ["replace:/chats/"])
})

test("treats an unknown entry marker as a direct entry", () => {
  assert.equal(parseChatRoomEntry("push"), "direct")
})
