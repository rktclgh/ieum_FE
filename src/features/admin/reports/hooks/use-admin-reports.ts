"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"

import { adminStatsKeys } from "@/features/admin/dashboard/lib/admin-stats-keys"
import {
  confirmAdminReport,
  dismissAdminReport,
  getAdminReport,
  getAdminReports,
} from "@/features/admin/reports/api/admin-reports-api"
import type { AdminReportsParams } from "@/features/admin/reports/api/admin-reports-api"
import { adminUserKeys } from "@/features/admin/users/hooks/use-admin-users"

const adminReportKeys = {
  all: ["admin", "reports"] as const,
  lists: () => [...adminReportKeys.all, "list"] as const,
  list: ({
    status,
    aiReviewState,
    decision,
    size,
  }: Omit<AdminReportsParams, "cursor">) => [
    ...adminReportKeys.lists(),
    { status, aiReviewState, decision, size },
  ] as const,
  detail: (reportId: number) =>
    [...adminReportKeys.all, "detail", reportId] as const,
}

function invalidateAdminReportDecisionQueries(
  queryClient: QueryClient,
  reportId: number,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminReportKeys.lists() }),
    queryClient.invalidateQueries({
      queryKey: adminReportKeys.detail(reportId),
      exact: true,
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: adminStatsKeys.reports,
      exact: true,
    }),
  ])
}

function invalidateAdminReportDismissalQueries(
  queryClient: QueryClient,
  reportId: number,
  reportedUserId: number | null,
) {
  const invalidations = [
    invalidateAdminReportDecisionQueries(queryClient, reportId),
    queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() }),
  ]

  if (reportedUserId !== null) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: adminUserKeys.detail(reportedUserId),
        exact: true,
      }),
    )
  }

  return Promise.all(invalidations)
}

function useAdminReports({
  status,
  aiReviewState,
  decision,
  size,
}: Omit<AdminReportsParams, "cursor">) {
  return useInfiniteQuery({
    queryKey: adminReportKeys.list({ status, aiReviewState, decision, size }),
    queryFn: ({ pageParam }) =>
      getAdminReports({
        status,
        aiReviewState,
        decision,
        cursor: pageParam,
        size,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

function useAdminReportDetail(reportId: number) {
  return useQuery({
    queryKey: adminReportKeys.detail(reportId),
    queryFn: () => getAdminReport(reportId),
  })
}

function useConfirmAdminReport(reportId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => confirmAdminReport(reportId),
    onSettled: () => invalidateAdminReportDecisionQueries(queryClient, reportId),
  })
}

function useDismissAdminReport(
  reportId: number,
  reportedUserId: number | null,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => dismissAdminReport(reportId),
    onSettled: () => invalidateAdminReportDismissalQueries(queryClient, reportId, reportedUserId),
  })
}

export {
  adminReportKeys,
  useAdminReportDetail,
  useAdminReports,
  useConfirmAdminReport,
  useDismissAdminReport,
}
