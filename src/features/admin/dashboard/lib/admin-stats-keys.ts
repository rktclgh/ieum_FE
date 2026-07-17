import type { AdminStatsOverviewParams } from "@/features/admin/dashboard/api/admin-stats-api"

const adminStatsKeys = {
  all: ["admin", "stats"] as const,
  overview: ["admin", "stats", "overview"] as const,
  overviewRange: ({ from, to, bucket }: AdminStatsOverviewParams) => [
    ...adminStatsKeys.overview,
    { from, to, bucket },
  ] as const,
}

export { adminStatsKeys }
