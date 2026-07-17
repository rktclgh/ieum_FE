interface MessageReportTarget {
  kind: "message"
  chatId: number
  messageId: number
  targetName?: string
}

interface ScheduleReportTarget {
  kind: "schedule"
  meetingId: number
  scheduleId: number
  targetName?: string
}

type ReportTarget = MessageReportTarget | ScheduleReportTarget

interface SearchParamReader {
  get(name: string): string | null
}

function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function optionalTargetName(params: SearchParamReader): string | undefined {
  const value = params.get("target")?.trim()
  return value || undefined
}

/**
 * Keeps report route inputs narrow: the legacy message target remains supported,
 * while schedule reports must carry their meeting-scoped identifiers explicitly.
 */
function parseReportTarget(params: SearchParamReader): ReportTarget | null {
  const kind = params.get("kind") ?? "message"
  const targetName = optionalTargetName(params)

  if (kind === "message") {
    const chatId = parsePositiveInteger(params.get("chatId"))
    const messageId = parsePositiveInteger(params.get("messageId"))
    if (chatId === null || messageId === null) return null
    return { kind, chatId, messageId, targetName }
  }

  if (kind === "schedule") {
    const meetingId = parsePositiveInteger(params.get("meetingId"))
    const scheduleId = parsePositiveInteger(params.get("scheduleId"))
    if (meetingId === null || scheduleId === null) return null
    return { kind, meetingId, scheduleId, targetName }
  }

  return null
}

export { parseReportTarget }
export type { ReportTarget, MessageReportTarget, ScheduleReportTarget }
