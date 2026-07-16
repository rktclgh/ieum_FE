import type { MeetingScheduleInput } from "../api/meetup-types"
import { toKstIso, type MeetupDateValue, type MeetupTimeValue } from "../constants/create-meetup"

interface MeetupScheduleState {
  date: MeetupDateValue | null
  time: MeetupTimeValue | null
  isDateUndecided: boolean
}

/** 날짜 미정이거나 날짜·시간이 모두 있는 경우에만 모임 작성 조건을 충족한다. */
function hasCompleteMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState): boolean {
  return isDateUndecided || (date !== null && time !== null)
}

/** 완성된 날짜·시간을 API schedule로 바꾸고, 날짜 미정·미완성 상태에서는 생략한다. */
function buildMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState): MeetingScheduleInput | undefined {
  if (isDateUndecided || !date || !time) return undefined

  return { startsAt: toKstIso(date, time) }
}

export { buildMeetupSchedule, hasCompleteMeetupSchedule }
export type { MeetupScheduleState }
