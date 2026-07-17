"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { ReportPageContent } from "@/features/report/components/report-page-content"
import { parseReportTarget } from "@/features/report/lib/report-target"

function ChatReportRoute() {
  const searchParams = useSearchParams()
  const target = parseReportTarget(searchParams)

  if (target === null) {
    return <RoutePageState kind="invalid-link" />
  }

  const targetKey =
    target.kind === "message"
      ? `${target.kind}:${target.chatId}:${target.messageId}`
      : `${target.kind}:${target.meetingId}:${target.scheduleId}`

  return <ReportPageContent key={targetKey} target={target} />
}

export default function ChatReportPage() {
  return (
    <React.Suspense fallback={<RoutePageState kind="loading" />}>
      <ChatReportRoute />
    </React.Suspense>
  )
}
