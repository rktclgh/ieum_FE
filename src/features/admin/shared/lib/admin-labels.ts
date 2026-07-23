import type {
  AdminReportDecision,
  ReportAiReviewState,
  ReportReason,
  ReportStatus,
  SanctionType,
  UserStatus,
} from "@/features/admin/shared/types/admin-types"

type AdminLocale = "ko" | "en" | string

const reportReasonKo: Record<ReportReason, string> = {
  spam: "스팸",
  ad: "광고",
  abuse: "욕설/비방",
  obscene: "음란물",
  harassment: "괴롭힘",
  etc: "기타",
}

const reportStatusKo: Record<ReportStatus, string> = {
  pending: "처리 대기",
  ai_reviewed: "AI 검토 완료",
  confirmed: "신고 확정",
  dismissed: "신고 기각",
}

const aiReviewStateKo: Record<ReportAiReviewState, string> = {
  pending: "대기",
  processing: "처리 중",
  retry: "재시도 대기",
  completed: "완료",
  cancelled: "취소",
  dead: "실패",
}

const adminReportDecisionKo: Record<AdminReportDecision, string> = {
  suspend: "제재 권고",
  hold: "보류",
  normal: "정상",
}

const sanctionTypeKo: Record<SanctionType, string> = {
  temporary: "일시 정지",
  permanent: "영구 정지",
}

const userStatusKo: Record<UserStatus, string> = {
  active: "활성",
  suspended: "정지",
}

function maybeKo<T extends string>(
  locale: AdminLocale,
  labels: Record<T, string>,
  value: T,
) {
  return locale === "ko" ? labels[value] : value
}

function getReportReasonLabel(value: ReportReason, locale: AdminLocale) {
  return maybeKo(locale, reportReasonKo, value)
}

function getReportStatusLabel(value: ReportStatus, locale: AdminLocale) {
  return maybeKo(locale, reportStatusKo, value)
}

function getReportAiReviewStateLabel(
  value: ReportAiReviewState,
  locale: AdminLocale,
) {
  return maybeKo(locale, aiReviewStateKo, value)
}

function getAdminReportDecisionLabel(
  value: AdminReportDecision | null,
  locale: AdminLocale,
) {
  return value === null ? "—" : maybeKo(locale, adminReportDecisionKo, value)
}

function getSanctionTypeLabel(value: SanctionType, locale: AdminLocale) {
  return maybeKo(locale, sanctionTypeKo, value)
}

function getUserStatusLabel(value: UserStatus, locale: AdminLocale) {
  return maybeKo(locale, userStatusKo, value)
}

export {
  getAdminReportDecisionLabel,
  getReportAiReviewStateLabel,
  getReportReasonLabel,
  getReportStatusLabel,
  getSanctionTypeLabel,
  getUserStatusLabel,
}
