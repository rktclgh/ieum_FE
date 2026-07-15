import { apiClient } from "@/lib/api/client"

interface UserStatsResponse {
  from: string
  to: string
  signupCount: number
  activeUserCount: number
  suspendedUserCount: number
}

interface ContentStatsResponse {
  from: string
  to: string
  pinCount: number
  questionCount: number
  meetingCount: number
  answerCount: number
  acceptedRate: number
  messageCount: number
}

interface ReportStatsResponse {
  from: string
  to: string
  reportCount: number
  aiReviewedCount: number
  confirmedCount: number
  dismissedCount: number
  sanctionCount: number
}

async function getAdminUserStats() {
  const { data } = await apiClient.get<UserStatsResponse>("/api/v1/admin/stats/users")
  return data
}

async function getAdminContentStats() {
  const { data } = await apiClient.get<ContentStatsResponse>("/api/v1/admin/stats/content")
  return data
}

async function getAdminReportStats() {
  const { data } = await apiClient.get<ReportStatsResponse>("/api/v1/admin/stats/reports")
  return data
}

export { getAdminContentStats, getAdminReportStats, getAdminUserStats }
export type { ContentStatsResponse, ReportStatsResponse, UserStatsResponse }
