"use client"

import { useQuery } from "@tanstack/react-query"

import {
  getAdminStatsOverview,
  type AdminStatsOverviewParams,
} from "@/features/admin/dashboard/api/admin-stats-api"
import { adminStatsKeys } from "@/features/admin/dashboard/lib/admin-stats-keys"

function useAdminStatsOverview(range: AdminStatsOverviewParams) {
  const query = useQuery({
    queryKey: adminStatsKeys.overviewRange({
      from: range.from,
      to: range.to,
      bucket: range.bucket,
    }),
    queryFn: ({ signal }) => getAdminStatsOverview(range, signal),
    placeholderData: (previousData) => previousData,
  })

  return query
}

export { useAdminStatsOverview }
