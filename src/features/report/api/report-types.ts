// 백엔드 신고 API 타입. 계약: docs/api-reference.md §11 (POST /api/v1/reports).

type ReportReason = "spam" | "ad" | "abuse" | "obscene" | "harassment" | "etc"

interface CreateReportRequest {
  messageId: number
  reason: ReportReason
  detail?: string
}

interface CreateReportResponse {
  reportId: number
}

export type { ReportReason, CreateReportRequest, CreateReportResponse }
