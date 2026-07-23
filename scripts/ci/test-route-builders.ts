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
      myNotifications: routes.myNotifications(),
      myPermissions: routes.myPermissions(),
      myInquiry: routes.myInquiry(),
      adminHome: routes.adminHome(),
      adminLogin: routes.adminLogin(),
      adminUsers: routes.adminUsers(),
      adminReports: routes.adminReports(),
      adminInquiries: routes.adminInquiries(),
      adminContent: routes.adminContent(),
    },
    {
      home: "/",
      login: "/login/",
      join: "/join/",
      socialJoin: "/join/social/",
      kakaoCallback: "/oauth/kakao/callback/",
      chats: "/chats/",
      questions: "/questions/",
      friends: "/friends/",
      my: "/my/",
      myEdit: "/my/edit/",
      myNotifications: "/my/notifications/",
      myPermissions: "/my/permissions/",
      myInquiry: "/my/inquiry/",
      adminHome: "/admin/",
      adminLogin: "/admin/login/",
      adminUsers: "/admin/users/",
      adminReports: "/admin/reports/",
      adminInquiries: "/admin/inquiries/",
      adminContent: "/admin/content/",
    }
  )
})

test("detail route builders produce the exact canonical query URLs", () => {
  assert.deepEqual(
    {
      chatRoom: routes.chatRoom(11),
      chatNotices: routes.chatNotices(11),
      chatReport: routes.chatReport(11, 29),
      chatSchedule: routes.chatSchedule(11),
      meetupDetail: routes.meetupDetail(37),
      questionDetail: routes.questionDetail(41),
      adminUserDetail: routes.adminUserDetail(7),
      adminReportDetail: routes.adminReportDetail(9),
    },
    {
      chatRoom: "/chats/room/?chatId=11",
      chatNotices: "/chats/notices/?chatId=11",
      chatReport: "/chats/report/?chatId=11&messageId=29",
      chatSchedule: "/chats/schedule/?chatId=11",
      meetupDetail: "/meetups/detail/?meetingId=37",
      questionDetail: "/questions/detail/?questionId=41",
      adminUserDetail: "/admin/users/detail/?userId=7",
      adminReportDetail: "/admin/reports/detail/?reportId=9",
    }
  )
})

test("in-app chat-room navigation carries an explicit back-entry marker", () => {
  assert.equal(routes.chatRoom(11, "app"), "/chats/room/?chatId=11&entry=app")
})

test("detail route builders reject invalid numeric input", () => {
  const invalidIds = [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]

  for (const value of invalidIds) {
    assert.throws(() => routes.chatRoom(value), RangeError)
    assert.throws(() => routes.chatNotices(value), RangeError)
    assert.throws(() => routes.chatSchedule(value), RangeError)
    assert.throws(() => routes.meetupDetail(value), RangeError)
    assert.throws(() => routes.questionDetail(value), RangeError)
    assert.throws(() => routes.chatReport(value, 29), RangeError)
    assert.throws(() => routes.chatReport(11, value), RangeError)
    assert.throws(() => routes.adminUserDetail(value), RangeError)
    assert.throws(() => routes.adminReportDetail(value), RangeError)
  }
})

test("chatReport safely encodes optional target query values", () => {
  assert.equal(
    routes.chatReport(11, 29, "홍 길동 & 운영팀?"),
    "/chats/report/?chatId=11&messageId=29&target=%ED%99%8D+%EA%B8%B8%EB%8F%99+%26+%EC%9A%B4%EC%98%81%ED%8C%80%3F"
  )
})
