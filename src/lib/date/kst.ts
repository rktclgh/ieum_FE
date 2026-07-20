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

/** 모임 상세용 날짜만 라벨: "2026.07.07" (시간 미정일 때 시각 없이 붙여 쓴다) */
function formatKstDateOnlyLabel(input: Date | string | number): string {
  const [year, month, day] = getKstDateKey(input).split("-")
  return `${year}.${month}.${day}`
}

/**
 * 현재(또는 주어진) 시각을 KST 기준 12시간제 조각으로 반환한다: { period, hour(1–12), minute(0–59) }.
 * 기기 로컬 타임존과 무관하게 Asia/Seoul로 계산한다.
 */
function getKstTimeParts(
  input: Date | string | number = new Date()
): { period: "am" | "pm"; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST_TIME_ZONE,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(input))

  const hour24 = Number(parts.find((part) => part.type === "hour")?.value)
  const minute = Number(parts.find((part) => part.type === "minute")?.value)
  const period = hour24 < 12 ? "am" : "pm"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  return { period, hour: hour12, minute }
}

// 그룹핑 루프에서 메시지마다 반복 호출되므로 formatter를 모듈 스코프에서 한 번만 생성해 재사용한다.
const KST_MINUTE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** 그룹핑용 분 단위 키: KST 기준 "2026-07-09 08:21". 유효하지 않은 입력은 빈 문자열. */
function getKstMinuteKey(input: Date | string | number): string {
  const date = new Date(input)
  if (isNaN(date.getTime())) return ""
  const parts = KST_MINUTE_KEY_FORMAT.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`
}

export {
  getKstDateKey,
  formatKstFullDate,
  formatKstShortDate,
  isKstToday,
  formatKstTime,
  formatKstDateTimeLabel,
  formatKstDateOnlyLabel,
  getKstTimeParts,
  getKstMinuteKey,
}
