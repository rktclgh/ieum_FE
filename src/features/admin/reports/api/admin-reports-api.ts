import type {
  AdminReportDecision,
  JsonValue,
  ReportAiReviewState,
  ReportReason,
  ReportStatus,
} from "@/features/admin/shared/types/admin-types"
import { apiClient } from "@/lib/api/client"
import { compactQuery } from "@/features/admin/shared/lib/admin-query"

type AdminReportTargetType = "message" | "answer"

interface AdminReportUserSummary {
  userId: number
  nickname: string
}

interface AdminReportTargetSummary {
  type: AdminReportTargetType
  id: number
  deleted: boolean
}

interface AdminReportAiSummary {
  reviewState: ReportAiReviewState
  recommendation: string | null
  decision: AdminReportDecision | null
  confidence: number | null
  reviewedAt: string | null
}

interface AdminReportListItem {
  reportId: number
  target: AdminReportTargetSummary
  reporter: AdminReportUserSummary
  reportedUser: AdminReportUserSummary | null
  reason: ReportReason
  status: ReportStatus
  ai: AdminReportAiSummary
  createdAt: string
}

interface AdminReportListResponse {
  items: AdminReportListItem[]
  nextCursor: string | null
}

interface AdminReportAiDetail {
  reviewState: ReportAiReviewState
  recommendation: string | null
  reason: string | null
  confidence: number | null
  modelVersion: string | null
  policyVersion: string | null
  reviewedAt: string | null
  decision: AdminReportDecision | null
  policySetHash: string | null
  result: JsonValue | null
  lastErrorCode: string | null
}

interface AdminReportResolution {
  decision: ReportStatus
  resolvedBy: AdminReportUserSummary
  resolvedAt: string
}

interface AdminReportSanctionItem {
  sanctionId: number
  decisionSource: string
  type: "temporary" | "permanent"
  reason: string
  admin: AdminReportUserSummary | null
  startsAt: string
  endsAt: string | null
  releasedAt: string | null
  releasedBy: AdminReportUserSummary | null
  createdAt: string
}

interface AdminReportDetailResponse extends Omit<AdminReportListItem, "ai"> {
  detail: string | null
  contextSnapshot: JsonValue | null
  contextHash: string | null
  ai: AdminReportAiDetail
  resolution: AdminReportResolution | null
  sanctions: AdminReportSanctionItem[]
}

interface AdminReportsParams {
  status?: ReportStatus | ""
  aiReviewState?: ReportAiReviewState | ""
  decision?: AdminReportDecision | ""
  cursor?: string | null
  size: number
}

async function getAdminReports(
  params: AdminReportsParams,
): Promise<AdminReportListResponse> {
  const response = await apiClient.get<AdminReportListResponse>(
    "/api/v1/admin/reports",
    {
      params: compactQuery({
        status: params.status,
        aiReviewState: params.aiReviewState,
        decision: params.decision,
        cursor: params.cursor,
        size: params.size,
      }),
    },
  )
  return response.data
}

async function getAdminReport(
  reportId: number,
): Promise<AdminReportDetailResponse> {
  const response = await apiClient.get<AdminReportDetailResponse>(
    `/api/v1/admin/reports/${reportId}`,
  )
  return response.data
}

async function confirmAdminReport(reportId: number): Promise<void> {
  await apiClient.post(`/api/v1/admin/reports/${reportId}/confirm`)
}

async function dismissAdminReport(reportId: number): Promise<void> {
  await apiClient.post(`/api/v1/admin/reports/${reportId}/dismiss`)
}

export {
  confirmAdminReport,
  dismissAdminReport,
  getAdminReport,
  getAdminReports,
}
export type {
  AdminReportAiDetail,
  AdminReportAiSummary,
  AdminReportDetailResponse,
  AdminReportListItem,
  AdminReportListResponse,
  AdminReportResolution,
  AdminReportSanctionItem,
  AdminReportsParams,
  AdminReportTargetSummary,
  AdminReportTargetType,
  AdminReportUserSummary,
}
