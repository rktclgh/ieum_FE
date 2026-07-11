import { getKstDateKey } from "@/lib/date/kst"
import type { CalendarItem, ScheduleStatus } from "@/features/schedule/api/schedule-types"

// 캘린더 화면(ScheduleListItem/ScheduleCalendar)이 소비하는 UI 모델.
interface ScheduleEntry {
  scheduleId: number
  meetingId: number
  roomId: number
  isHost: boolean
  status: ScheduleStatus
  /** KST 기준 YYYY-MM-DD */
  date: string
  /** 시작 시각까지 남은/지난 상대 라벨 (ex. "2시간 후") */
  relativeLabel: string
  title: string
  /** KST 기준 시각 라벨 (ex. "오전 7:00") */
  timeLabel: string
  locationLabel: string
}

const KST_TIME_ZONE = "Asia/Seoul"

function formatKstTime(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: KST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

// 지금 시각 대비 상대 시간을 로케일에 맞춰 표현한다(분/시간/일 단위 자동 선택).
function formatRelative(locale: string, iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute")
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour")
  return rtf.format(Math.round(diffMs / day), "day")
}

function adaptCalendarItem(item: CalendarItem, locale: string): ScheduleEntry {
  return {
    scheduleId: item.scheduleId,
    meetingId: item.meetingId,
    roomId: item.roomId,
    isHost: item.isHost,
    status: item.status,
    date: getKstDateKey(item.startsAt),
    relativeLabel: formatRelative(locale, item.startsAt),
    title: item.title,
    timeLabel: formatKstTime(locale, item.startsAt),
    locationLabel: item.location.label ?? item.location.address,
  }
}

export { adaptCalendarItem }
export type { ScheduleEntry }
