import assert from "node:assert/strict"
import test from "node:test"

import { parsePositiveInteger, routes } from "../../src/lib/navigation/routes"

test("parsePositiveInteger accepts canonical positive safe integers", () => {
  assert.equal(parsePositiveInteger("1"), 1)
  assert.equal(parsePositiveInteger(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER)
})

test("parsePositiveInteger rejects non-canonical or unsafe IDs", () => {
  const invalidIds = [
    null,
    "",
    "0",
    "-1",
    "01",
    "1.5",
    "1x",
    String(Number.MAX_SAFE_INTEGER + 1),
  ]

  for (const value of invalidIds) {
    assert.equal(parsePositiveInteger(value), null, `expected ${String(value)} to be invalid`)
  }
})

test("fixed route builders preserve the static export path contract", () => {
  assert.deepEqual(
    {
      home: routes.home(),
      login: routes.login(),
      join: routes.join(),
      socialJoin: routes.socialJoin(),
      kakaoCallback: routes.kakaoCallback(),
      chats: routes.chats(),
      questions: routes.questions(),
      friends: routes.friends(),
      my: routes.my(),
      myEdit: routes.myEdit(),
      mySettings: routes.mySettings(),
    },
    {
      home: "/",
      login: "/login/",
      join: "/join/",
      socialJoin: "/join/social/",
      kakaoCallback: "/oauth/kakao/callback",
      chats: "/chats/",
      questions: "/questions/",
      friends: "/friends/",
      my: "/my/",
      myEdit: "/my/edit/",
      mySettings: "/my/settings/",
    }
  )
})

test("detail route builders produce the six exact canonical query URLs", () => {
  assert.deepEqual(
    {
      chatRoom: routes.chatRoom(11),
      chatNotices: routes.chatNotices(11),
      chatReport: routes.chatReport(11, 29),
      chatSchedule: routes.chatSchedule(11),
      meetupDetail: routes.meetupDetail(37),
      questionDetail: routes.questionDetail(41),
    },
    {
      chatRoom: "/chats/room/?chatId=11",
      chatNotices: "/chats/notices/?chatId=11",
      chatReport: "/chats/report/?chatId=11&messageId=29",
      chatSchedule: "/chats/schedule/?chatId=11",
      meetupDetail: "/meetups/detail/?meetingId=37",
      questionDetail: "/questions/detail/?questionId=41",
    }
  )
})

test("chatReport safely encodes messageId and optional target query values", () => {
  const chatReport = routes.chatReport as unknown as (
    chatId: number,
    messageId: string,
    target?: string
  ) => string

  assert.equal(
    chatReport(11, "29&target=forged", "홍 길동 & 운영팀?"),
    "/chats/report/?chatId=11&messageId=29%26target%3Dforged&target=%ED%99%8D+%EA%B8%B8%EB%8F%99+%26+%EC%9A%B4%EC%98%81%ED%8C%80%3F"
  )
})
