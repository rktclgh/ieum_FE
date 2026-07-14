import { apiClient } from "@/lib/api/client"

import type {
  AnswerReportRequest,
  CreateReportRequest,
  CreateReportResponse,
} from "@/features/report/api/report-types"

// 상태 변경 (CSRF 필요). 신고 대상 유저는 서버가 messageId 로 자동 도출한다.
async function submitReport(payload: CreateReportRequest) {
  const { data } = await apiClient.post<CreateReportResponse>("/api/v1/reports", payload)
  return data
}

// 답변 신고 — BE 이슈 #69 계약. (CSRF 필요)
async function reportAnswer(answerId: number, body: AnswerReportRequest) {
  const { data } = await apiClient.post<CreateReportResponse>(
    `/api/v1/answers/${answerId}/report`,
    body
  )
  return data
}

export { submitReport, reportAnswer }
