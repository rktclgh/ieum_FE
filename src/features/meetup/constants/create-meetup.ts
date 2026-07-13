/** 새 모임 작성 폼의 값 계약과 표시용 포매팅 헬퍼 (백엔드 연동 전 프레젠테이션 계약, #47에서 연동) */

/** 모임 제목 최대 글자 수 (초과 시 에러) */
export const TITLE_MAX_LENGTH = 15

export interface MeetupDateValue {
  year: number
  month: number
  day: number
}

export interface MeetupTimeValue {
  period: "am" | "pm"
  /** 12시간제 시각 (1–12) */
  hour: number
  /** 분 (0–59) */
  minute: number
}

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
