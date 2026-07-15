"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

import {
  answerAdminInquiry,
  getAdminInquiries,
} from "@/features/admin/inquiries/api/admin-inquiries-api"
import type {
  AdminInquiriesParams,
  AnswerInquiryRequest,
} from "@/features/admin/inquiries/api/admin-inquiries-api"

const adminInquiryKeys = {
  all: ["admin", "inquiries"] as const,
  lists: () => [...adminInquiryKeys.all, "list"] as const,
  list: ({ status, size }: Omit<AdminInquiriesParams, "cursor">) => [
    ...adminInquiryKeys.lists(),
    { status, size },
  ] as const,
}

function invalidateAdminInquiryQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: adminInquiryKeys.all,
    refetchType: "none",
  })
}

function useAdminInquiries({
  status,
  size,
}: Omit<AdminInquiriesParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: adminInquiryKeys.list({ status, size }),
    queryFn: ({ pageParam }) =>
      getAdminInquiries({ status, cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

function useAnswerAdminInquiry(inquiryId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: AnswerInquiryRequest) =>
      answerAdminInquiry(inquiryId, body),
    onSettled: () => invalidateAdminInquiryQueries(queryClient),
  })
}

export {
  adminInquiryKeys,
  useAdminInquiries,
  useAnswerAdminInquiry,
}
