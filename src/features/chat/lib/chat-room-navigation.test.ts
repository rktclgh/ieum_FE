import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { navigateChatRoomBack } from "./chat-room-navigation.ts"

test("replaces a direct chat-room entry with the chat list", () => {
  const calls: string[] = []

  navigateChatRoomBack(1, {
    back: () => calls.push("back"),
    replace: (href) => calls.push(`replace:${href}`),
  })

  assert.deepEqual(calls, ["replace:/chats/"])
})

test("preserves browser back navigation after an in-app room entry", () => {
  const calls: string[] = []

  navigateChatRoomBack(2, {
    back: () => calls.push("back"),
    replace: (href) => calls.push(`replace:${href}`),
  })

  assert.deepEqual(calls, ["back"])
})
