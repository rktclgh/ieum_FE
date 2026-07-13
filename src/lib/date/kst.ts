const KST_TIME_ZONE = "Asia/Seoul"

/** "2026-07-09" 형태의 한국 날짜 키. 서버/클라이언트 로컬 타임존과 무관하게 KST 기준으로 계산한다. */
function getKstDateKey(input: Date | string | number = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(input))
}

function getKstWeekdayLabel(input: Date | string | number): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: KST_TIME_ZONE, weekday: "short" }).format(new Date(input))
}

/** 채팅 날짜 구분선용: "2026년 7월 9일" */
function formatKstFullDate(input: Date | string | number): string {
  const [year, month, day] = getKstDateKey(input).split("-")
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

/** 스크롤 중 표시되는 날짜 뱃지용: "07.09(목)" (연도 없음) */
function formatKstShortDate(input: Date | string | number): string {
  const [, month, day] = getKstDateKey(input).split("-")
  return `${month}.${day}(${getKstWeekdayLabel(input)})`
}

function isKstToday(input: Date | string | number): boolean {
  return getKstDateKey(input) === getKstDateKey(new Date())
}

/** 말풍선 시각용: "오전 8:17" (KST 기준) */
function formatKstTime(input: Date | string | number): string {
  const date = new Date(input)
  if (isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

/** 모임 상세용 일시 라벨: "2026.07.07" + 로케일별 시각(예 ko "오후 7:00", en "7:00 PM"). */
function formatKstDateTimeLabel(input: Date | string | number, locale: string): string {
  const [year, month, day] = getKstDateKey(input).split("-")
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: KST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(input))
  return `${year}.${month}.${day} ${time}`
}

export {
  getKstDateKey,
  formatKstFullDate,
  formatKstShortDate,
  isKstToday,
  formatKstTime,
  formatKstDateTimeLabel,
}
