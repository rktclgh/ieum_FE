import { apiClient } from "@/lib/api/client"

import type { CreateReportRequest, CreateReportResponse } from "@/features/report/api/report-types"

// 상태 변경 (CSRF 필요). 신고 대상 유저는 서버가 messageId 로 자동 도출한다.
async function submitReport(payload: CreateReportRequest) {
  const { data } = await apiClient.post<CreateReportResponse>("/api/v1/reports", payload)
  return data
}

export { submitReport }
