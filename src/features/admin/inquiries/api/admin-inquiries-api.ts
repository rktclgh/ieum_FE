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

interface FindAnsweredAdminInquiryOptions {
  signal?: AbortSignal
  maxPages?: number
}

// P2: replace this bounded cursor fallback when the backend exposes inquiry detail.
const DEFAULT_ANSWERED_INQUIRY_SCAN_PAGE_LIMIT = 100

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

async function findAnsweredAdminInquiry(
  inquiryId: number,
  options: FindAnsweredAdminInquiryOptions = {},
): Promise<AdminInquiryItem | null> {
  let cursor: string | null = null
  const seenCursors = new Set<string>()
  const maxPages = Math.max(
    0,
    Math.min(
      options.maxPages ?? DEFAULT_ANSWERED_INQUIRY_SCAN_PAGE_LIMIT,
      DEFAULT_ANSWERED_INQUIRY_SCAN_PAGE_LIMIT,
    ),
  )

  for (let pageCount = 0; pageCount < maxPages; pageCount += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new Error("Admin inquiry scan aborted")
    }

    const page = await getAdminInquiries(
      { status: "answered", cursor, size: 20 },
      options.signal,
    )
    const inquiry = page.items.find((item) => item.inquiryId === inquiryId)
    if (inquiry !== undefined) return inquiry

    cursor = page.nextCursor
    if (cursor === null) return null
    if (seenCursors.has(cursor)) return null
    seenCursors.add(cursor)
  }

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
