"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"

import {
  answerAdminInquiry,
  findAnsweredAdminInquiry,
  getAdminInquiries,
} from "@/features/admin/inquiries/api/admin-inquiries-api"
import type {
  AdminInquiriesParams,
  AdminInquiryItem,
} from "@/features/admin/inquiries/api/admin-inquiries-api"
import {
  adminInquiryAnswerLifecycleKey,
  claimAdminInquiryAnswer,
  createAdminInquiryAnswerMutationOptions,
  getAdminInquiryAnswerLifecycleRegistry,
  initialAdminInquiryAnswerLifecycleRegistry,
  retryAdminInquiryAnswerConvergence,
} from "@/features/admin/inquiries/lib/admin-inquiry-answer-lifecycle"
import type {
  AdminInquiryAnswerInput,
  AdminInquiryAnswerLifecycleDependencies,
} from "@/features/admin/inquiries/lib/admin-inquiry-answer-lifecycle"
import { getApiErrorCode } from "@/lib/api/errors"

const adminInquiryKeys = {
  all: ["admin", "inquiries"] as const,
  lists: () => [...adminInquiryKeys.all, "list"] as const,
  list: ({ status, size }: Omit<AdminInquiriesParams, "cursor">) => [
    ...adminInquiryKeys.lists(),
    { status, size },
  ] as const,
}

function adminInquiriesInfiniteQueryOptions({
  status,
  size,
}: Omit<AdminInquiriesParams, "cursor">) {
  return {
    queryKey: adminInquiryKeys.list({ status, size }),
    queryFn: ({
      pageParam,
      signal,
    }: {
      pageParam: string | null
      signal: AbortSignal
    }) => getAdminInquiries({ status, cursor: pageParam, size }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page: { nextCursor: string | null }) => page.nextCursor,
  }
}

function invalidateAdminInquiryQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: adminInquiryKeys.all,
    refetchType: "none",
  })
}

function createAdminInquiryAnswerDependencies(
  queryClient: QueryClient,
): AdminInquiryAnswerLifecycleDependencies {
  return {
    answerInquiry: answerAdminInquiry,
    findAnsweredInquiry: findAnsweredAdminInquiry,
    invalidateInquiries: () => invalidateAdminInquiryQueries(queryClient),
    isAlreadyAnsweredError: (error) =>
      getApiErrorCode(error) === "INQUIRY_ALREADY_ANSWERED",
    refetchCanonicalList: async ({ status, size }) => {
      const options = adminInquiriesInfiniteQueryOptions({ status, size })
      const query = queryClient.getQueryCache().find({
        queryKey: options.queryKey,
        exact: true,
      })

      if (query !== undefined) {
        await queryClient.refetchQueries(
          { queryKey: options.queryKey, exact: true, type: "all" },
          { cancelRefetch: true, throwOnError: true },
        )
        const data = queryClient.getQueryData<
          InfiniteData<
            Awaited<ReturnType<typeof getAdminInquiries>>,
            string | null
          >
        >(options.queryKey)
        if (data === undefined) {
          throw new Error("Canonical admin inquiry list was not cached")
        }
        return data.pages.flatMap((page) => page.items)
      }

      const data = await queryClient.fetchInfiniteQuery(options)
      return data.pages.flatMap((page) => page.items)
    },
  }
}

function useAdminInquiries({
  status,
  size,
}: Omit<AdminInquiriesParams, "cursor">) {
  return useInfiniteQuery(adminInquiriesInfiniteQueryOptions({ status, size }))
}

function useAdminInquiryAnswerLifecycles() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: adminInquiryAnswerLifecycleKey,
    queryFn: async () => initialAdminInquiryAnswerLifecycleRegistry,
    initialData: () => getAdminInquiryAnswerLifecycleRegistry(queryClient),
    enabled: false,
    gcTime: Infinity,
    staleTime: Infinity,
  })

  return query.data
}

function useAnswerAdminInquiry() {
  const queryClient = useQueryClient()
  const dependencies = createAdminInquiryAnswerDependencies(queryClient)
  const mutation = useMutation(
    createAdminInquiryAnswerMutationOptions(queryClient, dependencies),
  )

  const submit = (input: AdminInquiryAnswerInput) => {
    const execution = claimAdminInquiryAnswer(queryClient, input)
    if (execution === null) return false

    mutation.mutate(execution)
    return true
  }

  const retryConvergence = (inquiryId: number) =>
    retryAdminInquiryAnswerConvergence(
      queryClient,
      inquiryId,
      createAdminInquiryAnswerDependencies(queryClient),
    )

  return { ...mutation, retryConvergence, submit }
}

function getAdminInquiryLifecycleRecords(
  registry: ReturnType<typeof getAdminInquiryAnswerLifecycleRegistry>,
) {
  return Object.values(registry.records).sort(
    (left, right) => left.operationId - right.operationId,
  )
}

function findAdminInquiryLifecycle(
  registry: ReturnType<typeof getAdminInquiryAnswerLifecycleRegistry>,
  inquiry: Pick<AdminInquiryItem, "inquiryId">,
) {
  return registry.records[String(inquiry.inquiryId)]
}

export {
  adminInquiryKeys,
  findAdminInquiryLifecycle,
  getAdminInquiryLifecycleRecords,
  useAdminInquiries,
  useAdminInquiryAnswerLifecycles,
  useAnswerAdminInquiry,
}
