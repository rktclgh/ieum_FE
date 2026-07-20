import { getKstDateKey } from "@/lib/date/kst"
import type {
  CalendarItem,
  MeetingScheduleItem,
  ScheduleStatus,
} from "@/features/schedule/api/schedule-types"

// 일정 카드(ScheduleListItem/ScheduleCalendar)가 소비하는 공통 UI 모델.
interface ScheduleCardEntry {
  scheduleId: number
  status: ScheduleStatus
  /** KST 기준 YYYY-MM-DD */
  date: string
  /** 시작 시각까지 남은/지난 상대 라벨 (ex. "2시간 후", 시간 미정이면 일 단위) */
  relativeLabel: string
  title: string
  /** 시간 미정이면 timeUndecidedLabel, 아니면 KST 기준 시각 라벨 (ex. "오전 7:00") */
  timeLabel: string
  timeUndecided: boolean
  locationLabel: string
}

// 전역 캘린더 항목의 UI 모델. 기존 consumer를 위해 유지한다.
interface ScheduleEntry extends ScheduleCardEntry {
  scheduleId: number
  meetingId: number
  roomId: number
  isHost: boolean
}

// 모임 채팅 일정 관리 화면의 UI 모델. capability는 서버 응답을 그대로 보존한다.
interface MeetingScheduleEntry extends ScheduleCardEntry {
  meetingId: number
  startsAt: string
  endsAt: string | null
  createdByUserId: number | null
  canEdit: boolean
  canDelete: boolean
  canReport: boolean
}

const KST_TIME_ZONE = "Asia/Seoul"

function formatKstTime(locale: string, iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, {
    timeZone: KST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

// 지금 시각 대비 상대 시간을 로케일에 맞춰 표현한다(분/시간/일 단위 자동 선택).
function formatRelative(locale: string, iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diffMs = date.getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute")
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour")
  return rtf.format(Math.round(diffMs / day), "day")
}

// 시간 미정 항목은 파생 startsAt이 KST 자정에 앵커링돼 있어 시:분 단위로 상대 시간을 재면 어긋난다.
// 오늘(KST) 대비 날짜 차이만 일 단위로 표현한다.
function formatRelativeByDate(locale: string, dateKey: string): string {
  const diffDays = Math.round((Date.parse(dateKey) - Date.parse(getKstDateKey())) / 86_400_000)
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diffDays, "day")
}

function adaptCalendarItem(item: CalendarItem, locale: string, timeUndecidedLabel: string): ScheduleEntry {
  const dateKey = item.date ?? getKstDateKey(item.startsAt)
  return {
    scheduleId: item.scheduleId,
    meetingId: item.meetingId,
    roomId: item.roomId,
    isHost: item.isHost,
    status: item.status,
    date: dateKey,
    timeUndecided: item.timeUndecided,
    relativeLabel: item.timeUndecided ? formatRelativeByDate(locale, dateKey) : formatRelative(locale, item.startsAt),
    title: item.title ?? "",
    timeLabel: item.timeUndecided ? timeUndecidedLabel : formatKstTime(locale, item.startsAt),
    locationLabel: item.location.label ?? item.location.address,
  }
}

function adaptMeetingScheduleItem(
  item: MeetingScheduleItem,
  meetingId: number,
  locale: string,
  timeUndecidedLabel: string
): MeetingScheduleEntry {
  const dateKey = item.date ?? getKstDateKey(item.startsAt)
  return {
    scheduleId: item.scheduleId,
    meetingId,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    createdByUserId: item.createdByUserId,
    canEdit: item.canEdit,
    canDelete: item.canDelete,
    canReport: item.canReport,
    status: item.status,
    date: dateKey,
    timeUndecided: item.timeUndecided,
    relativeLabel: item.timeUndecided ? formatRelativeByDate(locale, dateKey) : formatRelative(locale, item.startsAt),
    title: item.title ?? "",
    timeLabel: item.timeUndecided ? timeUndecidedLabel : formatKstTime(locale, item.startsAt),
    locationLabel: item.locationName ?? "",
  }
}

export { adaptCalendarItem, adaptMeetingScheduleItem }
export type { ScheduleCardEntry, ScheduleEntry, MeetingScheduleEntry }
