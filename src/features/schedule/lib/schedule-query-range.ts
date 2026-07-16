import type { MeetingScheduleRange } from "@/features/schedule/api/schedule-types"

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/**
 * The meeting schedule controller binds OffsetDateTime, unlike the legacy
 * global calendar endpoint. Keep this conversion at the meeting-scoped query
 * boundary so the selected calendar month is queried in a stable KST range.
 */
function buildKstMonthScheduleRange(year: number, month: number): MeetingScheduleRange {
  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || month < 1 || month > 12) {
    throw new RangeError("year and month must identify a valid calendar month")
  }

  const lastDay = new Date(year, month, 0).getDate()
  const prefix = `${year}-${pad(month)}`

  return {
    from: `${prefix}-01T00:00:00+09:00`,
    to: `${prefix}-${pad(lastDay)}T23:59:59.999+09:00`,
  }
}

export { buildKstMonthScheduleRange }
