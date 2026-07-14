import type { ReportReasonKey } from "@/features/report/constants/report-reasons"
import type { ReportReason } from "@/features/report/api/report-types"

// FE i18n 키 → 백엔드 reason enum(spam|ad|abuse|obscene|harassment|etc).
const REASON_KEY_TO_REASON: Record<ReportReasonKey, ReportReason> = {
  reasonDobae: "spam",
  reasonAd: "ad",
  reasonAbuse: "abuse",
  reasonSexualHarassment: "harassment",
  reasonPornography: "obscene",
  reasonEtc: "etc",
}

function toReportReason(key: ReportReasonKey): ReportReason {
  return REASON_KEY_TO_REASON[key]
}

export { toReportReason }
