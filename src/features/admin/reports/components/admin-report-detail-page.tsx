"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import {
  useAdminReportDetail,
  useConfirmAdminReport,
  useDismissAdminReport,
} from "@/features/admin/reports/hooks/use-admin-reports"
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"

function formatDateTime(
  value: string | null,
  formatter: Intl.DateTimeFormat,
) {
  return value ? formatter.format(new Date(value)) : "—"
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded-xl bg-gray-50 p-4">
      <dt className="text-body-medium-14 text-gray-600">{label}</dt>
      <dd className="break-words text-body-regular-14 text-gray-900">{value}</dd>
    </div>
  )
}

function isReportDecisionConflict(error: unknown) {
  const code = getApiErrorCode(error)
  return (
    code === "REPORT_ALREADY_RESOLVED" ||
    code === "REPORT_CONCURRENTLY_CHANGED"
  )
}

function AdminReportDetailPage({ reportId }: { reportId: number }) {
  const { language, messages } = useTranslation()
  const detailQuery = useAdminReportDetail(reportId)
  const reportedUserId = detailQuery.data?.reportedUser?.userId ?? null
  const confirmMutation = useConfirmAdminReport(reportId)
  const dismissMutation = useDismissAdminReport(reportId, reportedUserId)
  const decisionLatch = React.useRef(false)
  const [decisionBusyState, setDecisionBusyState] = React.useState(false)
  const [pendingDecision, setPendingDecision] =
    React.useState<"confirm" | "dismiss" | null>(null)
  const [resolvedConflict, setResolvedConflict] = React.useState(false)
  const decisionBusy =
    decisionBusyState ||
    confirmMutation.isPending ||
    dismissMutation.isPending ||
    (resolvedConflict && detailQuery.isFetching)
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const numberFormatter = new Intl.NumberFormat(language, {
    maximumFractionDigits: 4,
  })
  const mutationError = confirmMutation.isError
    ? confirmMutation.error
    : dismissMutation.isError
      ? dismissMutation.error
      : null
  const decisionError =
    mutationError && !isReportDecisionConflict(mutationError)
      ? getApiErrorMessage(mutationError, messages.admin.common.loadError)
      : null

  const openDecisionDialog = (decision: "confirm" | "dismiss") => {
    confirmMutation.reset()
    dismissMutation.reset()
    setResolvedConflict(false)
    setPendingDecision(decision)
  }

  const handleDecisionConfirm = () => {
    if (!pendingDecision || decisionLatch.current) return

    decisionLatch.current = true
    setDecisionBusyState(true)
    const mutation =
      pendingDecision === "confirm" ? confirmMutation : dismissMutation

    mutation.mutate(undefined, {
      onError: (error) => {
        if (isReportDecisionConflict(error)) {
          setResolvedConflict(true)
          void detailQuery.refetch()
        }
      },
      onSettled: () => {
        decisionLatch.current = false
        setDecisionBusyState(false)
        setPendingDecision(null)
      },
    })
  }

  if (detailQuery.isPending) {
    return <AdminAsyncState kind="loading" />
  }

  if (detailQuery.isError && detailQuery.data === undefined) {
    return (
      <AdminAsyncState
        kind="error"
        onRetry={() => void detailQuery.refetch()}
        retryDisabled={detailQuery.isFetching}
        isRetrying={detailQuery.isFetching}
      />
    )
  }

  const report = detailQuery.data
  const {
    target,
    reporter,
    reportedUser,
    contextSnapshot,
    ai,
    resolution,
    sanctions,
  } = report
  const canDecide =
    report.status === "pending" || report.status === "ai_reviewed"

  return (
    <section aria-labelledby="admin-report-detail-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-report-detail-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.reports.detail} #{report.reportId}
        </h1>
        <p className="text-body-regular-14 text-gray-600">{report.status}</p>
      </header>

      {detailQuery.isError && (
        <AdminAsyncState
          kind="error"
          onRetry={() => void detailQuery.refetch()}
          retryDisabled={detailQuery.isFetching}
          isRetrying={detailQuery.isFetching}
        />
      )}

      <section aria-labelledby="admin-report-summary-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-report-summary-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.reports.title}
        </h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="ID" value={report.reportId} />
          <DetailField
            label={messages.admin.reports.target}
            value={`${target.type} #${target.id}${target.deleted ? " · deleted" : ""}`}
          />
          <DetailField
            label={messages.admin.reports.reporter}
            value={`${reporter.nickname} #${reporter.userId}`}
          />
          <DetailField
            label={messages.admin.reports.reportedUser}
            value={
              reportedUser
                ? `${reportedUser.nickname} #${reportedUser.userId}`
                : messages.admin.reports.missingReportedUser
            }
          />
          <DetailField label={messages.admin.reports.reason} value={report.reason} />
          <DetailField label={messages.admin.reports.status} value={report.status} />
          <DetailField
            label={messages.admin.reports.createdAt}
            value={formatDateTime(report.createdAt, dateFormatter)}
          />
        </dl>
        <div className="space-y-2">
          <h3 className="text-body-medium-14 text-gray-700">
            {messages.admin.reports.detail}
          </h3>
          <p className="whitespace-pre-wrap text-body-regular-14 text-gray-900">
            {report.detail ?? "—"}
          </p>
        </div>
      </section>

      <section aria-labelledby="admin-report-evidence-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-report-evidence-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.reports.evidence}
        </h2>
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-950 p-4 text-body-regular-14 text-white">
          {contextSnapshot === null
            ? "—"
            : JSON.stringify(contextSnapshot, null, 2)}
        </pre>
        <DetailField
          label={messages.admin.reports.evidenceHash}
          value={report.contextHash ?? "—"}
        />
      </section>

      <section aria-labelledby="admin-report-ai-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-report-ai-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.reports.aiResult}
        </h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label={messages.admin.reports.aiState} value={ai.reviewState} />
          <DetailField
            label={messages.admin.reports.recommendation}
            value={ai.recommendation ?? "—"}
          />
          <DetailField label={messages.admin.reports.reason} value={ai.reason ?? "—"} />
          <DetailField
            label={messages.admin.reports.confidence}
            value={ai.confidence === null ? "—" : numberFormatter.format(ai.confidence)}
          />
          <DetailField
            label={messages.admin.reports.reviewedAt}
            value={formatDateTime(ai.reviewedAt, dateFormatter)}
          />
          <DetailField
            label={messages.admin.reports.decision}
            value={ai.decision ?? "—"}
          />
          <DetailField
            label={messages.admin.reports.modelVersion}
            value={ai.modelVersion ?? "—"}
          />
          <DetailField
            label={messages.admin.reports.policyVersion}
            value={ai.policyVersion ?? "—"}
          />
          <DetailField
            label={messages.admin.reports.policySetHash}
            value={ai.policySetHash ?? "—"}
          />
          <DetailField
            label={messages.admin.reports.lastErrorCode}
            value={ai.lastErrorCode ?? "—"}
          />
        </dl>
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-950 p-4 text-body-regular-14 text-white">
          {ai.result === null ? "—" : JSON.stringify(ai.result, null, 2)}
        </pre>
      </section>

      <section aria-labelledby="admin-report-resolution-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-report-resolution-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.reports.resolution}
        </h2>
        {resolution === null ? (
          <AdminAsyncState kind="empty" />
        ) : (
          <dl className="grid gap-3 md:grid-cols-3">
            <DetailField
              label={messages.admin.reports.decision}
              value={resolution.decision}
            />
            <DetailField
              label={messages.admin.reports.reporter}
              value={`${resolution.resolvedBy.nickname} #${resolution.resolvedBy.userId}`}
            />
            <DetailField
              label={messages.admin.reports.createdAt}
              value={formatDateTime(resolution.resolvedAt, dateFormatter)}
            />
          </dl>
        )}
      </section>

      <section aria-labelledby="admin-report-sanctions-title" className="space-y-4">
        <h2 id="admin-report-sanctions-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.reports.sanctions}
        </h2>
        {sanctions.length === 0 ? (
          <AdminAsyncState kind="empty" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1280px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.reports.sanctions}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">source</th>
                  <th scope="col" className="px-4 py-3">type</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.reason}</th>
                  <th scope="col" className="px-4 py-3">admin</th>
                  <th scope="col" className="px-4 py-3">startsAt</th>
                  <th scope="col" className="px-4 py-3">endsAt</th>
                  <th scope="col" className="px-4 py-3">releasedAt</th>
                  <th scope="col" className="px-4 py-3">releasedBy</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.reports.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {sanctions.map((sanction) => (
                  <tr key={sanction.sanctionId}>
                    <td className="px-4 py-3">{sanction.sanctionId}</td>
                    <td className="px-4 py-3">{sanction.decisionSource}</td>
                    <td className="px-4 py-3">{sanction.type}</td>
                    <td className="max-w-80 whitespace-pre-wrap px-4 py-3">
                      {sanction.reason}
                    </td>
                    <td className="px-4 py-3">
                      {sanction.admin
                        ? `${sanction.admin.nickname} #${sanction.admin.userId}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(sanction.startsAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(sanction.endsAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(sanction.releasedAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      {sanction.releasedBy
                        ? `${sanction.releasedBy.nickname} #${sanction.releasedBy.userId}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(sanction.createdAt, dateFormatter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resolvedConflict && (
        <p role="status" className="rounded-xl bg-yellow-50 p-4 text-body-regular-14 text-gray-900">
          {messages.admin.reports.resolvedConflict}
        </p>
      )}
      {decisionError && (
        <p role="alert" className="text-body-regular-14 text-red">
          {decisionError}
        </p>
      )}

      {canDecide ? (
        <section aria-labelledby="admin-report-decision-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
          <h2 id="admin-report-decision-title" className="text-title-semibold-18 text-gray-900">
            {messages.admin.reports.decision}
          </h2>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.reports.confirmNotice}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              disabled={decisionBusy}
              aria-busy={decisionBusy || undefined}
              onClick={() => openDecisionDialog("confirm")}
            >
              {messages.admin.reports.confirm}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={decisionBusy}
              onClick={() => openDecisionDialog("dismiss")}
            >
              {messages.admin.reports.dismiss}
            </Button>
          </div>
        </section>
      ) : (
        <section aria-labelledby="admin-report-readonly-title" className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h2 id="admin-report-readonly-title" className="text-title-semibold-18 text-gray-900">
            {messages.admin.reports.resolution}
          </h2>
          <p className="text-body-regular-14 text-gray-700">
            {resolution?.decision ?? report.status}
          </p>
        </section>
      )}

      <ConfirmDialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!decisionBusy && !decisionLatch.current && !open) setPendingDecision(null)
        }}
        title={
          pendingDecision === "confirm"
            ? messages.admin.reports.confirm
            : messages.admin.reports.dismiss
        }
        description={
          pendingDecision === "confirm"
            ? messages.admin.reports.confirmNotice
            : messages.admin.reports.dismiss
        }
        cancelLabel={messages.admin.common.cancel}
        confirmLabel={
          pendingDecision === "confirm"
            ? messages.admin.reports.confirm
            : messages.admin.reports.dismiss
        }
        onConfirm={handleDecisionConfirm}
        confirmDisabled={decisionBusy}
      />
    </section>
  )
}

export { AdminReportDetailPage }
