interface ScheduleTimeValue {
  period: "am" | "pm"
  hour: number
  minute: number
}

interface SchedulePlaceValue {
  address: string
  label?: string
}

interface ScheduleEditorInput {
  selectedDate: string
  title: string
  time: ScheduleTimeValue | null
  place: SchedulePlaceValue | null
}

interface ScheduleEditorRequest {
  title: string
  locationName: string
  startsAt: string
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function isValidTime(value: ScheduleTimeValue): boolean {
  return (
    (value.period === "am" || value.period === "pm") &&
    Number.isInteger(value.hour) &&
    value.hour >= 1 &&
    value.hour <= 12 &&
    Number.isInteger(value.minute) &&
    value.minute >= 0 &&
    value.minute <= 59
  )
}

function toTwentyFourHour({ period, hour }: ScheduleTimeValue): number {
  if (period === "am") return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

function toKstScheduleIso(dateKey: string, time: ScheduleTimeValue): string {
  const hour = String(toTwentyFourHour(time)).padStart(2, "0")
  const minute = String(time.minute).padStart(2, "0")
  return `${dateKey}T${hour}:${minute}:00+09:00`
}

/**
 * Builds the thin request shape expected by the meeting-scoped schedule API.
 * This intentionally has no map coordinate fields because schedules only store
 * the displayable place name selected through the existing meetup location UI.
 */
function buildScheduleEditorRequest(input: ScheduleEditorInput): ScheduleEditorRequest | null {
  const title = input.title.trim()
  const locationName = input.place?.label?.trim() || input.place?.address.trim() || ""

  if (!title || !locationName || !input.time || !isValidDateKey(input.selectedDate) || !isValidTime(input.time)) {
    return null
  }

  return {
    title,
    locationName,
    startsAt: toKstScheduleIso(input.selectedDate, input.time),
  }
}

/** Date keys have a fixed YYYY-MM-DD shape, so lexical comparison is KST-safe. */
function isPastScheduleDate(selectedDate: string, todayDate: string): boolean {
  return isValidDateKey(selectedDate) && isValidDateKey(todayDate) && selectedDate < todayDate
}

export { buildScheduleEditorRequest, isPastScheduleDate, toKstScheduleIso }
export type { ScheduleEditorInput, ScheduleEditorRequest, SchedulePlaceValue, ScheduleTimeValue }
