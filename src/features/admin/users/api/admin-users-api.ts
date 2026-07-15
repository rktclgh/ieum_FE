import { apiClient } from "@/lib/api/client"

import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import type {
  CursorPage,
  ReportReason,
  ReportStatus,
  SanctionType,
  UserStatus,
} from "@/features/admin/shared/types/admin-types"
import type { CreateSanctionRequest } from "@/features/admin/users/lib/admin-sanction"
import type { UserRole } from "@/features/session/types/user-role"

type UserGrade = "bronze" | "silver" | "gold" | "platinum" | "diamond"
type AuthProvider = "email" | "google" | "kakao"

interface AdminUserItem {
  userId: number
  email: string
  nickname: string
  role: UserRole
  status: UserStatus
  grade: UserGrade
  provider: AuthProvider
  lastActiveAt: string | null
}

interface AdminUserProfile extends AdminUserItem {
  birthDate: string | null
  gender: "male" | "female" | "other" | null
  nationality: string | null
  profileImageUrl: string | null
}

interface AdminUserActivity {
  questionCount: number
  answerCount: number
  acceptedCount: number
  reportedCount: number
}

interface AdminUserReportItem {
  reportId: number
  reason: ReportReason
  status: ReportStatus
  reporterId: number
  reporterNickname: string | null
  messageId: number | null
  detail: string | null
  createdAt: string
}

interface AdminUserSanctionItem {
  sanctionId: number
  type: SanctionType
  reason: string
  createdAt: string
  createdBy: number | null
  endsAt: string | null
  releasedAt: string | null
  releasedBy: number | null
}

interface AdminUserDetailResponse {
  user: AdminUserProfile
  activity: AdminUserActivity
  reports: AdminUserReportItem[]
  sanctions: AdminUserSanctionItem[]
}

interface CreateSanctionResponse {
  sanctionId: number
}

interface AdminUsersParams {
  status?: UserStatus | ""
  q?: string
  cursor?: string | null
  size: number
}

async function getAdminUsers(params: AdminUsersParams) {
  const { data } = await apiClient.get<CursorPage<AdminUserItem>>(
    "/api/v1/admin/users",
    {
      params: compactQuery({
        status: params.status,
        q: params.q,
        cursor: params.cursor,
        size: params.size,
      }),
    },
  )
  return data
}

async function getAdminUser(userId: number) {
  const { data } = await apiClient.get<AdminUserDetailResponse>(
    `/api/v1/admin/users/${userId}`,
  )
  return data
}

async function createAdminUserSanction(
  userId: number,
  body: CreateSanctionRequest,
) {
  const { data } = await apiClient.post<CreateSanctionResponse>(
    `/api/v1/admin/users/${userId}/sanctions`,
    body,
  )
  return data
}

async function activateAdminUser(userId: number) {
  await apiClient.post(`/api/v1/admin/users/${userId}/activate`)
}

export {
  activateAdminUser,
  createAdminUserSanction,
  getAdminUser,
  getAdminUsers,
}
export type {
  AdminUserActivity,
  AdminUserDetailResponse,
  AdminUserItem,
  AdminUserProfile,
  AdminUserReportItem,
  AdminUserSanctionItem,
  AdminUsersParams,
  AuthProvider,
  CreateSanctionRequest,
  CreateSanctionResponse,
  UserGrade,
}
