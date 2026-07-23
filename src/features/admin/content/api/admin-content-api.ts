import { apiClient } from "@/lib/api/client"

type AdminContentType = "question" | "meeting"

interface AdminContentPreview {
  contentType: AdminContentType
  contentId: number
  title: string
  authorNickname: string
  authorId: number
  createdAt: string
  deletedAt: string | null
}

async function getAdminContentPreview(
  type: AdminContentType,
  id: number,
): Promise<AdminContentPreview> {
  const response = await apiClient.get<AdminContentPreview>(
    `/api/v1/admin/content/${type}/${id}`,
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

export { deleteAdminContent, getAdminContentPreview }
export type { AdminContentPreview, AdminContentType }
