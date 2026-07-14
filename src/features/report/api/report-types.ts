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

// 답변 신고 (BE 이슈 #69). chat 메시지 신고와 달리 answerId로 대상 지정.
interface AnswerReportRequest {
  reason: ReportReason
  detail?: string
}

export type { ReportReason, CreateReportRequest, CreateReportResponse, AnswerReportRequest }
