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
): Promise<CursorPage<AdminInquiryItem>> {
  const { data } = await apiClient.get<CursorPage<AdminInquiryItem>>(
    "/api/v1/admin/inquiries",
    {
      params: compactQuery({
        status: params.status,
        cursor: params.cursor,
        size: params.size,
      }),
    },
  )
  return data
}

async function findAnsweredAdminInquiry(
  inquiryId: number,
): Promise<AdminInquiryItem | null> {
  let cursor: string | null = null
  const seenCursors = new Set<string>()

  do {
    const page = await getAdminInquiries({ status: "answered", cursor, size: 20 })
    const inquiry = page.items.find((item) => item.inquiryId === inquiryId)
    if (inquiry !== undefined) return inquiry

    cursor = page.nextCursor
    if (cursor !== null && seenCursors.has(cursor)) return null
    if (cursor !== null) seenCursors.add(cursor)
  } while (cursor !== null)

  return null
}

async function answerAdminInquiry(
  inquiryId: number,
  body: AnswerInquiryRequest,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/inquiries/${inquiryId}/answer`, body)
}

export { answerAdminInquiry, findAnsweredAdminInquiry, getAdminInquiries }

export type {
  AdminInquiriesParams,
  AdminInquiryItem,
  AdminInquiryStatus,
  AnswerInquiryRequest,
}
