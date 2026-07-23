import { apiClient } from "@/lib/api/client"
import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import { toAdminContentListPath } from "@/features/admin/content/lib/admin-content-path"
import type { CursorPage } from "@/features/admin/shared/types/admin-types"

type AdminContentType = "question" | "meeting"
type AdminContentListPath = "questions" | "meetings"

interface AdminContentListItem {
  contentType: AdminContentType
  contentId: number
  title: string
  authorNickname: string
  authorId: number
  resolved: boolean | null
  status: string | null
  participantCount: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface AdminContentDetail extends AdminContentListItem {
  content: string
}

interface AdminContentListParams {
  type: AdminContentType
  cursor?: string | null
  size: number
}

interface AdminContentUpdateRequest {
  title: string
  content: string
}

async function getAdminContents(
  params: AdminContentListParams,
): Promise<CursorPage<AdminContentListItem>> {
  const response = await apiClient.get<CursorPage<AdminContentListItem>>(
    `/api/v1/admin/content/${toAdminContentListPath(params.type)}`,
    {
      params: compactQuery({
        cursor: params.cursor,
        size: params.size,
      }),
    },
  )
  return response.data
}

async function getAdminContentDetail(
  type: AdminContentType,
  id: number,
): Promise<AdminContentDetail> {
  const response = await apiClient.get<AdminContentDetail>(
    `/api/v1/admin/content/${type}/${id}`,
  )
  return response.data
}

async function updateAdminContent(
  type: AdminContentType,
  id: number,
  body: AdminContentUpdateRequest,
): Promise<AdminContentDetail> {
  const response = await apiClient.patch<AdminContentDetail>(
    `/api/v1/admin/content/${type}/${id}`,
    body,
  )
  return response.data
}

async function deleteAdminContent(
  type: AdminContentType,
  id: number,
  confirmationToken: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/admin/content/${type}/${id}/hard`, {
    data: { confirmationToken },
  })
}

export {
  deleteAdminContent,
  getAdminContentDetail,
  getAdminContents,
  updateAdminContent,
}
export type {
  AdminContentDetail,
  AdminContentListItem,
  AdminContentListParams,
  AdminContentListPath,
  AdminContentType,
  AdminContentUpdateRequest,
}
