import type { AdminStatsOverviewParams } from "@/features/admin/dashboard/api/admin-stats-api"

const adminStatsKeys = {
  all: ["admin", "stats"] as const,
  overview: ({ from, to, bucket }: AdminStatsOverviewParams) => [
    ...adminStatsKeys.all,
    "overview",
    { from, to, bucket },
  ] as const,
  users: ["admin", "stats", "users"] as const,
  content: ["admin", "stats", "content"] as const,
  reports: ["admin", "stats", "reports"] as const,
}

export { adminStatsKeys }
