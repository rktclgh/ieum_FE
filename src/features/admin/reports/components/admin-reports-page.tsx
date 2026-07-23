"use client"

import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import {
  getAdminReportDecisionLabel,
  getReportAiReviewStateLabel,
  getReportReasonLabel,
  getReportStatusLabel,
} from "@/features/admin/shared/lib/admin-labels"
import type {
  AdminReportDecision,
  ReportAiReviewState,
  ReportStatus,
} from "@/features/admin/shared/types/admin-types"
import { useAdminReports } from "@/features/admin/reports/hooks/use-admin-reports"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function AdminReportsPage() {
  const { language, messages } = useTranslation()
  const [status, setStatus] = React.useState<ReportStatus | "">("")
  const [aiReviewState, setAiReviewState] = React.useState<ReportAiReviewState | "">("")
  const [decision, setDecision] = React.useState<AdminReportDecision | "">("")
  const reportsQuery = useAdminReports({ status, aiReviewState, decision, size: 20 })
  const reports = reportsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })

  return (
    <section aria-labelledby="admin-reports-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-reports-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.reports.title}
        </h1>
      </header>

      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 lg:grid-cols-3">
        <label
          htmlFor="admin-report-status"
          className="space-y-2 text-body-medium-14 text-gray-700"
        >
          <span className="block">{messages.admin.reports.status}</span>
          <select
            id="admin-report-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ReportStatus | "")}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">{messages.admin.common.all}</option>
            <option value="pending">{getReportStatusLabel("pending", language)}</option>
            <option value="ai_reviewed">
              {getReportStatusLabel("ai_reviewed", language)}
            </option>
            <option value="confirmed">
              {getReportStatusLabel("confirmed", language)}
            </option>
            <option value="dismissed">
              {getReportStatusLabel("dismissed", language)}
            </option>
          </select>
        </label>

        <label
          htmlFor="admin-report-ai-state"
          className="space-y-2 text-body-medium-14 text-gray-700"
        >
          <span className="block">{messages.admin.reports.aiState}</span>
          <select
            id="admin-report-ai-state"
            value={aiReviewState}
            onChange={(event) =>
              setAiReviewState(event.target.value as ReportAiReviewState | "")
            }
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">{messages.admin.common.all}</option>
            <option value="pending">
              {getReportAiReviewStateLabel("pending", language)}
            </option>
            <option value="processing">
              {getReportAiReviewStateLabel("processing", language)}
            </option>
            <option value="retry">{getReportAiReviewStateLabel("retry", language)}</option>
            <option value="completed">
              {getReportAiReviewStateLabel("completed", language)}
            </option>
            <option value="cancelled">
              {getReportAiReviewStateLabel("cancelled", language)}
            </option>
            <option value="dead">{getReportAiReviewStateLabel("dead", language)}</option>
          </select>
        </label>

        <label
          htmlFor="admin-report-decision"
          className="space-y-2 text-body-medium-14 text-gray-700"
        >
          <span className="block">{messages.admin.reports.decision}</span>
          <select
            id="admin-report-decision"
            value={decision}
            onChange={(event) =>
              setDecision(event.target.value as AdminReportDecision | "")
            }
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">{messages.admin.common.all}</option>
            <option value="suspend">
              {getAdminReportDecisionLabel("suspend", language)}
            </option>
            <option value="hold">{getAdminReportDecisionLabel("hold", language)}</option>
            <option value="normal">
              {getAdminReportDecisionLabel("normal", language)}
            </option>
          </select>
        </label>
      </div>

      {reportsQuery.isPending ? (
        <AdminAsyncState kind="loading" />
      ) : reportsQuery.isError && reports.length === 0 ? (
        <AdminAsyncState
          kind="error"
          onRetry={() => void reportsQuery.refetch()}
          retryDisabled={reportsQuery.isFetching}
          isRetrying={reportsQuery.isFetching}
        />
      ) : reports.length === 0 ? (
        <AdminAsyncState kind="empty" />
      ) : (
        <div className="space-y-4">
          {reportsQuery.isError && !reportsQuery.isFetchNextPageError && (
            <AdminAsyncState
              kind="error"
              onRetry={() => void reportsQuery.refetch()}
              retryDisabled={reportsQuery.isFetching}
              isRetrying={reportsQuery.isFetching}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.reports.title}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.target}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.reporter}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.reportedUser}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.reason}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.aiState}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.decision}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.createdAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.detail}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {reports.map((report) => (
                  <tr key={report.reportId}>
                    <td className="px-4 py-3">{report.reportId}</td>
                    <td className="px-4 py-3">
                      {report.target.type} #{report.target.id}
                      {report.target.deleted
                        ? ` · ${messages.admin.reports.deleted}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      {report.reporter.nickname} #{report.reporter.userId}
                    </td>
                    <td className="px-4 py-3">
                      {report.reportedUser
                        ? `${report.reportedUser.nickname} #${report.reportedUser.userId}`
                        : messages.admin.reports.missingReportedUser}
                    </td>
                    <td className="px-4 py-3">
                      {getReportReasonLabel(report.reason, language)}
                    </td>
                    <td className="px-4 py-3">
                      {getReportStatusLabel(report.status, language)}
                    </td>
                    <td className="px-4 py-3">
                      {getReportAiReviewStateLabel(report.ai.reviewState, language)}
                    </td>
                    <td className="px-4 py-3">
                      {getAdminReportDecisionLabel(report.ai.decision, language)}
                    </td>
                    <td className="px-4 py-3">
                      {dateFormatter.format(new Date(report.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={routes.adminReportDetail(report.reportId)}
                        className="inline-flex rounded-lg px-2 py-1 text-body-medium-14 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {messages.admin.reports.detail}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reportsQuery.isFetchNextPageError ? (
            <AdminAsyncState
              kind="error"
              onRetry={() => void reportsQuery.fetchNextPage({ cancelRefetch: false })}
              retryDisabled={reportsQuery.isFetching}
              isRetrying={reportsQuery.isFetching}
            />
          ) : reportsQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void reportsQuery.fetchNextPage({ cancelRefetch: false })}
                disabled={reportsQuery.isFetching}
                aria-busy={reportsQuery.isFetching || undefined}
              >
                {reportsQuery.isFetchingNextPage
                  ? messages.admin.common.loading
                  : messages.admin.common.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

export { AdminReportsPage }
