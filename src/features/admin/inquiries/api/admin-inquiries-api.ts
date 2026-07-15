import type { AdminInquiryStatus } from "@/features/admin/inquiries/lib/admin-inquiry"
import { compactQuery } from "@/features/admin/shared/lib/admin-query"
import type { CursorPage } from "@/features/admin/shared/types/admin-types"
import { apiClient } from "@/lib/api/client"

interface AdminInquiryItem {
  inquiryId: number
  userId: number
  userEmail: string | null
  title: string
  content: string
  status: AdminInquiryStatus
  answer: string | null
  answeredBy: number | null
  answeredAt: string | null
  createdAt: string
}

interface AnswerInquiryRequest {
  answer: string
}

interface AdminInquiriesParams {
  status?: AdminInquiryStatus | ""
  cursor?: string | null
  size: number
}

async function getAdminInquiries(
  params: AdminInquiriesParams,
  signal?: AbortSignal,
): Promise<CursorPage<AdminInquiryItem>> {
  const { data } = await apiClient.get<CursorPage<AdminInquiryItem>>(
    "/api/v1/admin/inquiries",
    {
      params: compactQuery({
        status: params.status,
        cursor: params.cursor,
        size: params.size,
      }),
      signal,
    },
  )
  return data
}

async function getAdminInquiry(
  inquiryId: number,
  signal?: AbortSignal,
): Promise<AdminInquiryItem> {
  const { data } = await apiClient.get<AdminInquiryItem>(
    `/api/v1/admin/inquiries/${inquiryId}`,
    { signal },
  )
  return data
}

async function answerAdminInquiry(
  inquiryId: number,
  body: AnswerInquiryRequest,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/inquiries/${inquiryId}/answer`, body)
}

export { answerAdminInquiry, getAdminInquiries, getAdminInquiry }

export type {
  AdminInquiriesParams,
  AdminInquiryItem,
  AdminInquiryStatus,
  AnswerInquiryRequest,
}
