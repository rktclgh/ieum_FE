import assert from "node:assert/strict"
import test from "node:test"

import {
  buildMeetupSchedule,
  hasCompleteMeetupSchedule,
} from "../../src/features/meetup/lib/create-meetup-schedule"

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
