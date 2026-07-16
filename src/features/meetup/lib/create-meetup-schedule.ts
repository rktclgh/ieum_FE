import type { MeetingScheduleInput } from "../api/meetup-types"
import { toKstIso, type MeetupDateValue, type MeetupTimeValue } from "../constants/create-meetup"

interface MeetupScheduleState {
  date: MeetupDateValue | null
  time: MeetupTimeValue | null
  isDateUndecided: boolean
}

function hasCompleteMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState): boolean {
  return isDateUndecided || (date !== null && time !== null)
}

function buildMeetupSchedule({ date, time, isDateUndecided }: MeetupScheduleState): MeetingScheduleInput | undefined {
  if (isDateUndecided || !date || !time) return undefined

  return { startsAt: toKstIso(date, time) }
}

export { buildMeetupSchedule, hasCompleteMeetupSchedule }
export type { MeetupScheduleState }
