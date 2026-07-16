import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { acceptsRoomMessageForChannel, roomMessageDestination } from "./chat-room-message-subscription.ts"

test("user messages subscribe through the private room queue and system messages retain the room topic", () => {
  assert.equal(roomMessageDestination(17, "user"), "/user/queue/rooms/17")
  assert.equal(roomMessageDestination(17, "system"), "/topic/rooms/17")
})

test("each room-message channel only accepts its matching message type", () => {
  assert.equal(acceptsRoomMessageForChannel({ messageType: "user" }, "user"), true)
  assert.equal(acceptsRoomMessageForChannel({ messageType: "user" }, "system"), false)
  assert.equal(acceptsRoomMessageForChannel({ messageType: "system" }, "system"), true)
  assert.equal(acceptsRoomMessageForChannel({ messageType: "system" }, "user"), false)
  assert.equal(acceptsRoomMessageForChannel({}, "user"), true)
  assert.equal(acceptsRoomMessageForChannel({}, "system"), false)
})
