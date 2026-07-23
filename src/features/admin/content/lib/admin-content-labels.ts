import type { AdminContentStatus } from "@/features/admin/content/api/admin-content-api"
import type { AdminMessages } from "@/lib/i18n/messages/admin"

function getContentStatusLabel(
  status: AdminContentStatus,
  messages: { admin: AdminMessages },
) {
  return status === "active"
    ? messages.admin.content.active
    : messages.admin.content.deleted
}

function getResolvedLabel(
  resolved: boolean,
  messages: { admin: AdminMessages },
) {
  return resolved
    ? messages.admin.content.resolved
    : messages.admin.content.unresolved
}

function formatParticipantCount(
  participantCount: number | null,
  formatter: Intl.NumberFormat,
  messages: { admin: AdminMessages },
) {
  return participantCount === null
    ? messages.admin.content.noParticipants
    : formatter.format(participantCount)
}

export {
  formatParticipantCount,
  getContentStatusLabel,
  getResolvedLabel,
}
