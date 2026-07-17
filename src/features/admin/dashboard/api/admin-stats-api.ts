import { apiClient } from "@/lib/api/client"
import { compactQuery } from "@/features/admin/shared/lib/admin-query"

interface AdminStatsOverviewParams {
  from: string
  to: string
  bucket: "day"
}

interface AdminStatsOverview {
  from: string
  to: string
  bucket: "day"
  summary: {
    signupCount: number
    activeUserCount: number
    suspensionCount: number
    questionCount: number
    humanAnswerCount: number
    acceptedHumanAnswerCount: number
    acceptedRate: number
    reportCount: number
    aiReviewedCount: number
    confirmedCount: number
    dismissedCount: number
    sanctionCount: number
  }
  series: Array<{
    date: string
    signupCount: number
    activeUserCount: number
    questionCount: number
    humanAnswerCount: number
    acceptedHumanAnswerCount: number
    reportCount: number
    aiReviewedCount: number
    confirmedCount: number
    dismissedCount: number
    sanctionCount: number
  }>
  queues: {
    pendingReportCount: number
    retryReportCount: number
    deadReportCount: number
    pendingInquiryCount: number
  }
}

async function getAdminStatsOverview(
  params: AdminStatsOverviewParams,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<AdminStatsOverview>(
    "/api/v1/admin/stats/overview",
    {
      params: compactQuery({
        from: params.from,
        to: params.to,
        bucket: params.bucket,
      }),
      signal,
    },
  )
  return data
}

export { getAdminStatsOverview }
export type { AdminStatsOverview, AdminStatsOverviewParams }
