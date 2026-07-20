import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { executeSetPinned, resolvePinOperations } from "./chat-pin.ts"

test("pinning with no existing pin sends a single pin request", () => {
  const operations = resolvePinOperations({ roomId: 7, pinned: true })

  assert.deepEqual(operations, [{ roomId: 7, pinned: true }])
})

test("pinning while another room is pinned unpins the previous room first", () => {
  const operations = resolvePinOperations({ roomId: 7, pinned: true, replacingRoomId: 3 })

  assert.deepEqual(operations, [
    { roomId: 3, pinned: false },
    { roomId: 7, pinned: true },
  ])
})

test("pinning the already pinned room does not unpin itself", () => {
  const operations = resolvePinOperations({ roomId: 7, pinned: true, replacingRoomId: 7 })

  assert.deepEqual(operations, [{ roomId: 7, pinned: true }])
})

test("unpinning ignores the replacement target", () => {
  const operations = resolvePinOperations({ roomId: 7, pinned: false, replacingRoomId: 3 })

  assert.deepEqual(operations, [{ roomId: 7, pinned: false }])
})

test("replacement requests run in order", async () => {
  const calls: Array<[number, boolean]> = []

  await executeSetPinned(
    { roomId: 7, pinned: true, replacingRoomId: 3 },
    {
      setPinned: async (roomId: number, pinned: boolean) => {
        calls.push([roomId, pinned])
      },
    }
  )

  assert.deepEqual(calls, [
    [3, false],
    [7, true],
  ])
})

// 해제가 실패하면 새 고정을 보내지 않는다 → 두 방이 동시에 고정되는 상태를 막는다.
test("a failed unpin aborts before pinning the new room", async () => {
  const calls: Array<[number, boolean]> = []

  await assert.rejects(
    executeSetPinned(
      { roomId: 7, pinned: true, replacingRoomId: 3 },
      {
        setPinned: async (roomId: number, pinned: boolean) => {
          calls.push([roomId, pinned])
          throw new Error("network")
        },
      }
    ),
    /network/
  )

  assert.deepEqual(calls, [[3, false]])
})
