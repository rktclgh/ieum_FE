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
import type { MeetupDateSelection } from "../../src/features/meetup/constants/create-meetup"

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

test("one-time 모임에는 recurrenceRule을 넣을 수 없다", () => {
  const invalidRequest: CreateMeetingRequest = {
    title: "일회성 모임",
    type: "one_time",
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    // @ts-expect-error recurrenceRule is valid only for recurring meetings.
    recurrenceRule: "FREQ=WEEKLY",
    maxMembers: 99,
  }

  assert.ok(invalidRequest)
})

test("사전 생성한 one-time payload에도 recurrenceRule을 섞을 수 없다", () => {
  const payload = {
    title: "일회성 모임",
    type: "one_time" as const,
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    recurrenceRule: {
      frequency: "weekly" as const,
      intervalValue: 1,
      daysOfWeek: [2],
      startsOn: "2026-07-16",
    },
    maxMembers: 99,
  }

  // @ts-expect-error one-time payloads must reject recurrenceRule even after structural typing.
  const invalidRequest: CreateMeetingRequest = payload

  assert.ok(invalidRequest)
})

test("날짜 미정 선택에는 실제 날짜를 함께 넣을 수 없다", () => {
  // @ts-expect-error an undecided date selection must retain date as null.
  const invalidSelection: MeetupDateSelection = {
    isDateUndecided: true,
    date,
  }

  assert.ok(invalidSelection)
})

test("반복 모임은 구조화된 recurrenceRule을 필수로 가진다", () => {
  // @ts-expect-error recurring meeting requests must retain a recurrenceRule.
  const missingRule: CreateMeetingRequest = {
    title: "반복 모임",
    type: "recurring",
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    schedule: { startsAt: "2026-07-16T19:00:00+09:00" },
    maxMembers: 99,
  }
  const validRequest: CreateMeetingRequest = {
    title: "주간 반복 모임",
    type: "recurring",
    location: {
      lat: 37.5665,
      lng: 126.978,
      address: "서울특별시 중구 세종대로 110",
    },
    schedule: { startsAt: "2026-07-16T19:00:00+09:00" },
    recurrenceRule: {
      frequency: "weekly",
      intervalValue: 1,
      daysOfWeek: [2],
      startsOn: "2026-07-16",
      timezone: "Asia/Seoul",
    },
    maxMembers: 99,
  }

  assert.ok(missingRule)
  if (validRequest.type === "recurring") {
    assert.equal(validRequest.recurrenceRule.frequency, "weekly")
  }
})
