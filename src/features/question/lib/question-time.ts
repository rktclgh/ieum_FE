import type { Messages } from "@/lib/i18n/messages/ko"

// createdAt(ISO-8601) → "방금 전 / N분 전 / N시간 전 / N일 전".
// 미제공·파싱 실패 시 null(시각 라벨 생략). i18n 문구는 question 카탈로그에서 주입한다.
function formatRelativeTime(iso: string | undefined, t: Messages["question"]): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSeconds < 60) return t.timeJustNow

  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) return t.timeMinutesAgo(minutes)

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t.timeHoursAgo(hours)

  const days = Math.floor(hours / 24)
  return t.timeDaysAgo(days)
}

export { formatRelativeTime }
