"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { ReportPageContent } from "@/features/report/components/report-page-content"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function ChatReportRoute() {
  const searchParams = useSearchParams()
  const roomId = parsePositiveInteger(searchParams.get("chatId"))
  const messageId = parsePositiveInteger(searchParams.get("messageId"))

  if (roomId === null || messageId === null) {
    return <RoutePageState kind="invalid-link" />
  }

  return (
    <ReportPageContent
      key={`${roomId}:${messageId}`}
      messageId={messageId}
      targetName={searchParams.get("target") ?? undefined}
    />
  )
}

export default function ChatReportPage() {
  return (
    <React.Suspense fallback={<RoutePageState kind="loading" />}>
      <ChatReportRoute />
    </React.Suspense>
  )
}
