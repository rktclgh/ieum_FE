import type { AdminContentType } from "@/features/admin/content/api/admin-content-api"
import type { AdminMessages } from "@/lib/i18n/messages/admin"

const meetingStatusKo: Record<string, string> = {
  open: "모집 중",
  closed: "마감",
  cancelled: "취소됨",
  canceled: "취소됨",
  completed: "완료",
}

const meetingStatusEn: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  completed: "Completed",
}

function getMeetingStatusLabel(
  status: string | null,
  locale: string,
  messages: { admin: AdminMessages },
) {
  if (status === null) return messages.admin.content.noParticipants

  const normalized = status.trim().toLowerCase()
  if (normalized.length === 0) return messages.admin.content.noParticipants

  if (locale === "ko") return meetingStatusKo[normalized] ?? status
  return meetingStatusEn[normalized] ?? status
}

function getResolvedLabel(
  resolved: boolean | null,
  messages: { admin: AdminMessages },
) {
  if (resolved === null) return messages.admin.content.noParticipants

  return resolved
    ? messages.admin.content.resolved
    : messages.admin.content.unresolved
}

function getContentStatusLabel(
  type: AdminContentType,
  status: string | null,
  locale: string,
  messages: { admin: AdminMessages },
) {
  return type === "meeting"
    ? getMeetingStatusLabel(status, locale, messages)
    : messages.admin.content.noParticipants
}

function getContentResolvedLabel(
  type: AdminContentType,
  resolved: boolean | null,
  messages: { admin: AdminMessages },
) {
  return type === "question"
    ? getResolvedLabel(resolved, messages)
    : messages.admin.content.noParticipants
}

function formatParticipantCount(
  type: AdminContentType,
  participantCount: number | null,
  formatter: Intl.NumberFormat,
  messages: { admin: AdminMessages },
) {
  return type !== "meeting" || participantCount === null
    ? messages.admin.content.noParticipants
    : formatter.format(participantCount)
}

export {
  getContentResolvedLabel,
  formatParticipantCount,
  getContentStatusLabel,
  getMeetingStatusLabel,
  getResolvedLabel,
}
