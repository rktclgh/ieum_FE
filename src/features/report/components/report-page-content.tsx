"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/text-field/textarea"
import { REPORT_REASON_KEYS, type ReportReasonKey } from "@/features/report/constants/report-reasons"
import { ReportReasonOption } from "@/features/report/components/report-reason-option"
import { useSubmitReport } from "@/features/report/hooks/use-report-mutation"
import { toReportReason } from "@/features/report/lib/report-reason-map"
import { getReportErrorMessage } from "@/features/report/lib/report-error"
import type { ReportTarget } from "@/features/report/lib/report-target"
import { useTranslation } from "@/lib/i18n/use-translation"

const MAX_DETAIL_LENGTH = 1000

interface ReportPageContentProps {
  target: ReportTarget
}

function ReportPageContent({ target }: ReportPageContentProps) {
  const router = useRouter()
  const { messages } = useTranslation()
  const [selectedReason, setSelectedReason] = React.useState<ReportReasonKey | null>(null)
  const [detail, setDetail] = React.useState("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const submitReport = useSubmitReport()

  React.useEffect(() => {
    if (!submitError) return
    const timer = setTimeout(() => setSubmitError(null), 3000)
    return () => clearTimeout(timer)
  }, [submitError])

  const handleClose = () => router.back()

  const handleSubmit = () => {
    if (!selectedReason || submitReport.isPending) return
    setConfirmOpen(false)
    submitReport.mutate(
      { target, reason: toReportReason(selectedReason), detail: detail.trim() || undefined },
      {
        onSuccess: () => router.back(),
        onError: (error) => setSubmitError(getReportErrorMessage(error, messages)),
      }
    )
  }

  return (
    <main className="app-column app-viewport-height flex flex-col bg-white">
      <AppBar
        title={messages.report.title}
        trailingVariant="close"
        onLeadingClick={handleClose}
        onTrailingClick={handleClose}
      />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-3">
        <div className="flex flex-col gap-4">
          <p className="text-title-semibold-16 text-gray-900">{messages.report.reasonSectionTitle}</p>
          <div role="radiogroup" className="flex flex-col gap-4">
            {REPORT_REASON_KEYS.map((key) => (
              <ReportReasonOption
                key={key}
                label={messages.report[key]}
                selected={selectedReason === key}
                onSelect={() => setSelectedReason(key)}
              />
            ))}
          </div>
        </div>

        <Textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={MAX_DETAIL_LENGTH}
          placeholder={messages.report.detailPlaceholder}
          className="h-40 shrink-0"
        />

        <ul className="flex flex-col gap-2">
          {[messages.report.guideEtc, messages.report.guideReview].map((guide) => (
            <li key={guide} className="flex gap-2 text-body-regular-12 text-gray-400">
              <span className="mt-[6.5px] size-1 shrink-0 rounded-full bg-gray-400" />
              <span>{guide}</span>
            </li>
          ))}
        </ul>
      </div>

      {submitError && (
        <div className="pointer-events-none flex justify-center px-4 pb-2">
          <span className="rounded-full bg-gray-900/80 px-4 py-2 text-body-regular-13 text-white">
            {submitError}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 pt-2 pb-[calc(1rem+var(--safe-area-bottom))]">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 rounded-full border border-primary px-4 py-3 text-center text-body-medium-14 text-primary"
        >
          {messages.report.cancelButton}
        </button>
        <button
          type="button"
          disabled={!selectedReason || submitReport.isPending}
          onClick={() => setConfirmOpen(true)}
          className="flex-1 rounded-full bg-primary px-4 py-3 text-center text-body-medium-14 text-white disabled:opacity-50"
        >
          {messages.report.submitButton}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          target.kind === "schedule"
            ? target.targetName
              ? messages.report.confirmScheduleTitle(target.targetName)
              : messages.report.confirmScheduleTitleGeneric
            : target.targetName
              ? messages.report.confirmTitle(target.targetName)
              : messages.report.confirmTitleGeneric
        }
        description={messages.report.confirmDescription}
        cancelLabel={messages.report.cancelButton}
        confirmLabel={messages.report.submitButton}
        onConfirm={handleSubmit}
      />
    </main>
  )
}

export { ReportPageContent }
