/** 새 모임 작성 폼의 값 계약과 표시용 포매팅 헬퍼 */

/** 모임 제목 최대 글자 수 (초과 시 에러) */
export const TITLE_MAX_LENGTH = 15

// #50 와이어프레임에 인원 제한 입력이 없어, POST /meetings 필수값(maxMembers 2~99)은
// 허용 최대치로 보낸다(사실상 상한 미설정). 인원 제한 UI는 후속 이슈 후보.
export const DEFAULT_MAX_MEMBERS = 99

/** 장소 선택 결과. POST /meetings 의 location(LocationSnapshot) 으로 매핑된다. */
export interface MeetupPlaceValue {
  lat: number
  lng: number
  address: string
  label: string
}

export interface MeetupDateValue {
  year: number
  month: number
  day: number
}

/** 날짜 선택의 명시적 결과. 날짜 미정일 때는 실제 날짜를 함께 보낼 수 없다. */
export type MeetupDateSelection =
  | { date: null; isDateUndecided: true }
  | { date: MeetupDateValue | null; isDateUndecided: false }

export interface MeetupTimeValue {
  period: "am" | "pm"
  /** 12시간제 시각 (1–12) */
  hour: number
  /** 분 (0–59) */
  minute: number
}

/** 시간 선택의 명시적 결과. 시간 미정일 때는 실제 시각을 함께 보낼 수 없다. */
export type MeetupTimeSelection =
  | { time: null; isTimeUndecided: true }
  | { time: MeetupTimeValue | null; isTimeUndecided: false }

/** 해당 연·월의 마지막 날 (28~31) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 필드 표시용 날짜: "2026.07.07" (로케일 무관 숫자 포맷) */
export function formatDateValue({ year, month, day }: MeetupDateValue): string {
  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}.${mm}.${dd}`
}

/** 필드 표시용 시각: "오후 7:00" — 오전/오후 라벨은 로케일별 메시지에서 주입 */
export function formatTimeValue({ hour, minute }: MeetupTimeValue, periodLabel: string): string {
  return `${periodLabel} ${hour}:${String(minute).padStart(2, "0")}`
}

/** 12시간제(period/hour) → 24시간제 시각(0–23) */
function to24Hour({ period, hour }: MeetupTimeValue): number {
  if (period === "am") return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

/** KST 기준 날짜를 API 요청 형식(`YYYY-MM-DD`)으로 만든다. */
export function toDateKey(date: MeetupDateValue): string {
  const mm = String(date.month).padStart(2, "0")
  const dd = String(date.day).padStart(2, "0")
  return `${date.year}-${mm}-${dd}`
}

/** 12시간제 선택값을 API 요청 형식(`HH:mm`, KST)으로 만든다. */
export function toTimeKey(time: MeetupTimeValue): string {
  const hh = String(to24Hour(time)).padStart(2, "0")
  const min = String(time.minute).padStart(2, "0")
  return `${hh}:${min}`
}
