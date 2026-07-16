import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMeetupSchedule,
  hasCompleteMeetupSchedule,
} from "../../src/features/meetup/lib/create-meetup-schedule"
import type {
  CreateMeetingRequest,
  CreateMeetingResponse,
} from "../../src/features/meetup/api/meetup-types"

const date = { year: 2026, month: 7, day: 16 }
const time = { period: "pm" as const, hour: 7, minute: 0 }

test("날짜 미정 모임은 schedule을 만들지 않는다", () => {
  assert.equal(buildMeetupSchedule({ date: null, time: null, isDateUndecided: true }), undefined)
  assert.equal(hasCompleteMeetupSchedule({ date: null, time: null, isDateUndecided: true }), true)
})

test("실제 날짜와 시간은 KST schedule을 만든다", () => {
  assert.deepEqual(buildMeetupSchedule({ date, time, isDateUndecided: false }), {
    startsAt: "2026-07-16T19:00:00+09:00",
  })
  assert.equal(hasCompleteMeetupSchedule({ date, time, isDateUndecided: false }), true)
})

test("명시적 날짜 미정 없이 날짜 또는 시간이 빠지면 일정 조건이 불완전하다", () => {
  assert.equal(hasCompleteMeetupSchedule({ date, time: null, isDateUndecided: false }), false)
  assert.equal(buildMeetupSchedule({ date: null, time, isDateUndecided: false }), undefined)
})

test("날짜 미정 요청은 schedule 없이 만들고 null 일정 응답을 받는다", () => {
  const request: CreateMeetingRequest = {
    title: "날짜 미정 모임",
    type: "one_time",
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    maxMembers: 99,
  }
  const response: CreateMeetingResponse = {
    meetingId: 1,
    pinId: 2,
    roomId: 3,
    firstScheduleId: null,
  }

  assert.equal("schedule" in request, false)
  assert.equal(response.firstScheduleId, null)
})

test("반복 모임은 schedule 없이 만들 수 없다", () => {
  // @ts-expect-error recurring meeting requests must retain a required schedule.
  const invalidRequest: CreateMeetingRequest = {
    title: "반복 모임",
    type: "recurring",
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    maxMembers: 99,
  }

  assert.ok(invalidRequest)
})
