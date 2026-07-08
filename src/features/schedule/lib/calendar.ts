export interface CalendarCell {
  key: string
  dateKey: string
  day: number
  isCurrentMonth: boolean
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** month은 1~12 */
function getMonthGrid(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, i) => {
    const offset = i - firstWeekday

    if (offset < 0) {
      const day = daysInPrevMonth + offset + 1
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      return { key: `p-${day}`, dateKey: toDateKey(prevYear, prevMonth, day), day, isCurrentMonth: false }
    }

    if (offset >= daysInMonth) {
      const day = offset - daysInMonth + 1
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      return { key: `n-${day}`, dateKey: toDateKey(nextYear, nextMonth, day), day, isCurrentMonth: false }
    }

    const day = offset + 1
    return { key: `c-${day}`, dateKey: toDateKey(year, month, day), day, isCurrentMonth: true }
  })
}

/** 2023-01-01(일)을 기준으로 로케일에 맞는 요일 약어 7개를 일~토 순서로 반환 */
function getWeekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" })
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)))
}

function formatYearMonth(locale: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(year, month - 1, 1))
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

export { getMonthGrid, getWeekdayLabels, formatYearMonth, addMonths, toDateKey }
