import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { adaptNotification } from "./notification-adapter.ts"
import type { Messages } from "@/lib/i18n/messages/ko"

const messages = {
  notification: {
    copy: {
      "notification.friend.request": {
        title: "친구 요청",
        body: (params: Record<string, string>) => `${params.nickname ?? ""}님이 친구 요청을 보냈어요`,
      },
      "notification.radius.question": {
        title: "주변 새 질문",
        body: (params: Record<string, string>) => params.subject ?? "",
      },
    },
  },
} as unknown as Messages

function notification(overrides: Partial<Parameters<typeof adaptNotification>[0]>) {
  return {
    notificationId: 1,
    type: "friend",
    title: "친구 요청",
    body: "누군가 친구 요청을 보냈어요",
    messageKey: "notification.friend.request",
    messageParams: {},
    refId: 7,
    answerIsAi: null,
    isRead: false,
    createdAt: "2026-07-20T00:00:00Z",
    ...overrides,
  }
}

test("친구 요청 알림에 nickname이 없으면 서버 문구로 폴백한다", () => {
  const result = adaptNotification(notification({ messageParams: {} }), messages)

  assert.equal(result.title, "친구 요청")
  assert.equal(result.body, "누군가 친구 요청을 보냈어요")
})

test("주변 질문 알림에 subject가 없으면 서버 문구로 폴백한다", () => {
  const result = adaptNotification(
    notification({
      type: "question",
      title: "주변 새 질문",
      body: "오늘 저녁 뭐 먹을까요?",
      messageKey: "notification.radius.question",
      messageParams: {},
      refId: 8,
    }),
    messages,
  )

  assert.equal(result.title, "주변 새 질문")
  assert.equal(result.body, "오늘 저녁 뭐 먹을까요?")
})
