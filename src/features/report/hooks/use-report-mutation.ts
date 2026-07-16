"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { submitReport } from "@/features/report/api/report-api"
import type { ReportReason } from "@/features/report/api/report-types"
import type { ReportTarget } from "@/features/report/lib/report-target"
import { reportSchedule } from "@/features/schedule/api/schedule-api"
import { scheduleKeys } from "@/features/schedule/hooks/use-schedule-queries"

interface SubmitReportTargetRequest {
  target: ReportTarget
  reason: ReportReason
  detail?: string
}

function useSubmitReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ target, reason, detail }: SubmitReportTargetRequest) =>
      target.kind === "message"
        ? submitReport({ messageId: target.messageId, reason, detail })
        : reportSchedule(target.meetingId, target.scheduleId, { reason, detail }),
    onSuccess: (_, { target }) => {
      if (target.kind === "schedule") {
        return queryClient.invalidateQueries({ queryKey: scheduleKeys.meetingAll(target.meetingId) })
      }
    },
  })
}

export { useSubmitReport }
export type { SubmitReportTargetRequest }
