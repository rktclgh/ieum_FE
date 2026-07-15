import type { SanctionType } from "@/features/admin/shared/types/admin-types"

interface SanctionDraft {
  type: SanctionType
  reason: string
  endsAt: string
}

interface CreateSanctionRequest {
  type: SanctionType
  reason: string
  endsAt?: string
}

type SanctionValidationResult =
  | { ok: true; value: CreateSanctionRequest }
  | { ok: false; field: "reason" | "endsAt" }

function validateSanctionDraft(
  draft: SanctionDraft,
  now: Date,
): SanctionValidationResult {
  const reason = draft.reason.trim()

  if (reason.length === 0 || reason.length > 500) {
    return { ok: false, field: "reason" }
  }

  if (draft.type === "permanent") {
    return { ok: true, value: { type: draft.type, reason } }
  }

  const endsAt = new Date(draft.endsAt)

  if (draft.endsAt === "" || Number.isNaN(endsAt.getTime()) || endsAt <= now) {
    return { ok: false, field: "endsAt" }
  }

  return {
    ok: true,
    value: { type: draft.type, reason, endsAt: endsAt.toISOString() },
  }
}

export { validateSanctionDraft }
export type { CreateSanctionRequest, SanctionDraft, SanctionValidationResult }
