"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { SchedulePageContent } from "@/features/schedule/components/schedule-page-content"
import { SchedulePageSkeleton } from "@/features/schedule/components/schedule-skeleton"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function ChatScheduleRoute() {
  const searchParams = useSearchParams()
  const roomId = parsePositiveInteger(searchParams.get("chatId"))

  if (roomId === null) return <RoutePageState kind="invalid-link" />

  return <SchedulePageContent key={roomId} roomId={roomId} />
}

export default function ChatSchedulePage() {
  return (
    <React.Suspense fallback={<SchedulePageSkeleton />}>
      <ChatScheduleRoute />
    </React.Suspense>
  )
}
