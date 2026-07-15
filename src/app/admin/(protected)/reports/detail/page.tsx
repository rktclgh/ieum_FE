"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { AdminReportDetailPage } from "@/features/admin/reports/components/admin-report-detail-page"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function AdminReportDetailRoute() {
  const { messages } = useTranslation()
  const searchParams = useSearchParams()
  const reportId = parsePositiveInteger(searchParams.get("reportId"))

  if (reportId === null) {
    return <AdminAsyncState kind="empty" message={messages.route.invalidLink} />
  }

  return <AdminReportDetailPage key={reportId} reportId={reportId} />
}

export default function AdminReportDetailRoutePage() {
  return (
    <React.Suspense fallback={<AdminAsyncState kind="loading" />}>
      <AdminReportDetailRoute />
    </React.Suspense>
  )
}
