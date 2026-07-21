import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { executeRegisterChatNotice, executeSetChatNoticePinned, flattenChatNoticePages, mergePinnedNoticeForDisplay, sortChatNoticesForDisplay } from "./chat-notice.ts"

test("registered notices render pinned first, then newest createdAt, then newest noticeId", () => {
  const notices = [
    { noticeId: 1, pinned: false, createdAt: "2026-07-21T09:00:00+09:00" },
    { noticeId: 2, pinned: true, createdAt: "2026-07-21T08:00:00+09:00" },
    { noticeId: 3, pinned: false, createdAt: "2026-07-21T10:00:00+09:00" },
    { noticeId: 4, pinned: false, createdAt: "2026-07-21T10:00:00+09:00" },
  ]

  assert.deepEqual(
    sortChatNoticesForDisplay(notices).map((notice) => notice.noticeId),
    [2, 4, 3, 1]
  )
})

test("pin and unpin each use one server-owned notice command", async () => {
  const calls: string[] = []

  await executeSetChatNoticePinned(
    { roomId: 9, noticeId: 14, pinned: true },
    {
      pinNotice: async (roomId: number, noticeId: number) => {
        calls.push(`pin:${roomId}:${noticeId}`)
      },
      unpinNotice: async (roomId: number, noticeId: number) => {
        calls.push(`unpin:${roomId}:${noticeId}`)
      },
    }
  )
  await executeSetChatNoticePinned(
    { roomId: 9, noticeId: 14, pinned: false },
    {
      pinNotice: async (roomId: number, noticeId: number) => {
        calls.push(`pin:${roomId}:${noticeId}`)
      },
      unpinNotice: async (roomId: number, noticeId: number) => {
        calls.push(`unpin:${roomId}:${noticeId}`)
      },
    }
  )

  assert.deepEqual(calls, ["pin:9:14", "unpin:9:14"])
})

test("registering a chat notice pins the canonical server notice for the room banner", async () => {
  const calls: string[] = []

  await executeRegisterChatNotice(
    { roomId: 9, messageId: 15 },
    {
      registerNotice: async (roomId: number, messageId: number) => {
        calls.push(`register:${roomId}:${messageId}`)
        return { noticeId: 14, pinned: false }
      },
      pinNotice: async (roomId: number, noticeId: number) => {
        calls.push(`pin:${roomId}:${noticeId}`)
      },
    }
  )

  assert.deepEqual(calls, ["register:9:15", "pin:9:14"])
})

test("registering an already pinned notice does not repeat the pin command", async () => {
  const calls: string[] = []

  await executeRegisterChatNotice(
    { roomId: 9, messageId: 15 },
    {
      registerNotice: async () => {
        calls.push("register")
        return { noticeId: 14, pinned: true }
      },
      pinNotice: async () => {
        calls.push("pin")
      },
    }
  )

  assert.deepEqual(calls, ["register"])
})

test("pin failure is propagated without sending a fallback local replacement", async () => {
  const calls: string[] = []

  await assert.rejects(
    executeSetChatNoticePinned(
      { roomId: 9, noticeId: 14, pinned: true },
      {
        pinNotice: async (roomId: number, noticeId: number) => {
          calls.push(`pin:${roomId}:${noticeId}`)
          throw new Error("network")
        },
        unpinNotice: async (roomId: number, noticeId: number) => {
          calls.push(`unpin:${roomId}:${noticeId}`)
        },
      }
    ),
    /network/
  )

  assert.deepEqual(calls, ["pin:9:14"])
})

test("top-level pinned notice is included even when it is outside the current page", () => {
  const pageItems = [
    { noticeId: 1, pinned: false, createdAt: "2026-07-21T10:00:00+09:00" },
    { noticeId: 2, pinned: false, createdAt: "2026-07-21T09:00:00+09:00" },
  ]
  const pinnedNotice = { noticeId: 7, pinned: true, createdAt: "2026-07-20T09:00:00+09:00" }

  assert.deepEqual(
    mergePinnedNoticeForDisplay(pageItems, pinnedNotice).map((notice) => notice.noticeId),
    [7, 1, 2]
  )
})

test("notice pages flatten in backend latest-first cursor order", () => {
  const pages = [
    {
      items: [
        { noticeId: 4, pinned: false, createdAt: "2026-07-21T10:00:00+09:00" },
        { noticeId: 3, pinned: false, createdAt: "2026-07-21T09:00:00+09:00" },
      ],
      nextCursor: "older",
      pinnedNotice: null,
    },
    {
      items: [
        { noticeId: 2, pinned: false, createdAt: "2026-07-20T10:00:00+09:00" },
        { noticeId: 1, pinned: false, createdAt: "2026-07-20T09:00:00+09:00" },
      ],
      nextCursor: null,
      pinnedNotice: null,
    },
  ]

  assert.deepEqual(
    flattenChatNoticePages(pages).map((notice) => notice.noticeId),
    [4, 3, 2, 1]
  )
})
