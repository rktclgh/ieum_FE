import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { resolveNotificationRoute } from "./notification-link.ts"

test("친구 요청 알림은 refId(요청자 userId)로 해당 요청을 강조하도록 이동한다", () => {
  // refId 가 유효하면 highlightUserId 로 넘겨 해당 "받은 친구요청" 행을 강조한다.
  assert.equal(resolveNotificationRoute("friend", 77), "/friends/?highlightUserId=77")
  // refId 가 없어도 친구 페이지로는 이동한다(강조만 생략).
  assert.equal(resolveNotificationRoute("friend", null), "/friends/")
  assert.equal(resolveNotificationRoute("friend", 0), "/friends/")
})

test("답변/질문 알림은 질문 상세로 딥링크한다", () => {
  assert.equal(resolveNotificationRoute("question", 9), "/questions/detail/?questionId=9")
  assert.equal(resolveNotificationRoute("QUESTION_ANSWER", 9), "/questions/detail/?questionId=9")
})

test("모임 알림은 모임 상세로 딥링크한다", () => {
  assert.equal(resolveNotificationRoute("meeting", 5), "/meetups/detail/?meetingId=5")
})

test("채팅 알림은 채팅방으로 딥링크한다", () => {
  assert.equal(resolveNotificationRoute("chat", 7), "/chats/room/?chatId=7")
  assert.equal(resolveNotificationRoute("NEW_CHAT_MESSAGE", 7), "/chats/room/?chatId=7")
})

test("refId 가 필요한 타입은 refId 가 유효하지 않으면 이동하지 않는다", () => {
  assert.equal(resolveNotificationRoute("question", null), null)
  assert.equal(resolveNotificationRoute("chat", 0), null)
  assert.equal(resolveNotificationRoute("meeting", -1), null)
  assert.equal(resolveNotificationRoute("question", 1.5), null)
})

test("매핑 불가한 타입은 이동하지 않는다", () => {
  assert.equal(resolveNotificationRoute("system", 1), null)
  assert.equal(resolveNotificationRoute("location", 1), null)
  // 런타임에 문자열이 아닌 값이 와도 안전하게 폴백한다.
  assert.equal(resolveNotificationRoute(undefined as unknown as string, 1), null)
})
