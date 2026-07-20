import type { OneTimeMeetingScheduleInput } from "../api/meetup-types"
import {
  toDateKey,
  toTimeKey,
  type MeetupDateValue,
  type MeetupTimeValue,
} from "../constants/create-meetup"

interface MeetupScheduleState {
  date: MeetupDateValue | null
  time: MeetupTimeValue | null
  isDateUndecided: boolean
  isTimeUndecided: boolean
}

/** 날짜 미정이거나, 날짜가 있고 시각이 정해졌거나 명시적으로 시간 미정일 때만 작성 조건을 충족한다. */
function hasCompleteMeetupSchedule({
  date,
  time,
  isDateUndecided,
  isTimeUndecided,
}: MeetupScheduleState): boolean {
  if (isDateUndecided) return true

  return date !== null && (time !== null || isTimeUndecided)
}

/**
 * 완성된 일정을 API schedule로 바꾼다. 날짜 미정·미완성 상태에서는 생략한다.
 * 시간 미정은 `startTime`을 아예 보내지 않는 것으로 표현한다(ieum_BE#206 date/startTime/endTime 계약).
 */
function buildMeetupSchedule({
  date,
  time,
  isDateUndecided,
  isTimeUndecided,
}: MeetupScheduleState): OneTimeMeetingScheduleInput | undefined {
  if (isDateUndecided || !date) return undefined

  if (isTimeUndecided) {
    return { date: toDateKey(date) }
  }

  if (!time) return undefined

  return { date: toDateKey(date), startTime: toTimeKey(time) }
}

export { buildMeetupSchedule, hasCompleteMeetupSchedule }
export type { MeetupScheduleState }
