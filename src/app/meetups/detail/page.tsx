"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function MeetupDetailRoute() {
  const searchParams = useSearchParams()
  const meetingId = parsePositiveInteger(searchParams.get("meetingId"))

  if (meetingId === null) return <RoutePageState kind="invalid-link" />

  return <MeetupDetailContainer key={meetingId} meetingId={meetingId} />
}

export default function MeetupDetailPage() {
  return (
    <React.Suspense fallback={<RoutePageState kind="loading" />}>
      <MeetupDetailRoute />
    </React.Suspense>
  )
}
