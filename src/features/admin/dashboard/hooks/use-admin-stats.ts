"use client"

import { useQuery } from "@tanstack/react-query"

import {
  getAdminContentStats,
  getAdminReportStats,
  getAdminUserStats,
} from "@/features/admin/dashboard/api/admin-stats-api"
import { adminStatsKeys } from "@/features/admin/dashboard/lib/admin-stats-keys"

function useAdminStats() {
  const userQuery = useQuery({
    queryKey: adminStatsKeys.users,
    queryFn: getAdminUserStats,
  })
  const contentQuery = useQuery({
    queryKey: adminStatsKeys.content,
    queryFn: getAdminContentStats,
  })
  const reportsQuery = useQuery({
    queryKey: adminStatsKeys.reports,
    queryFn: getAdminReportStats,
  })

  const isPending = userQuery.isPending || contentQuery.isPending || reportsQuery.isPending
  const isError = userQuery.isError || contentQuery.isError || reportsQuery.isError
  const isFetching =
    userQuery.isFetching || contentQuery.isFetching || reportsQuery.isFetching
  const hasData =
    userQuery.data !== undefined &&
    contentQuery.data !== undefined &&
    reportsQuery.data !== undefined
  const refetch = () => Promise.all([
    userQuery.refetch(),
    contentQuery.refetch(),
    reportsQuery.refetch(),
  ])

  return {
    user: userQuery.data,
    content: contentQuery.data,
    reports: reportsQuery.data,
    isPending,
    isError,
    isFetching,
    hasData,
    refetch,
  }
}

export { useAdminStats }
