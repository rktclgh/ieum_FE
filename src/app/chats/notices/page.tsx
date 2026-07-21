"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { NoticePageContent } from "@/features/chat/components/notice-page-content"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function ChatNoticesRoute() {
  const searchParams = useSearchParams()
  const roomId = parsePositiveInteger(searchParams.get("chatId"))

  if (roomId === null) return <RoutePageState kind="invalid-link" />

  return <NoticePageContent key={roomId} roomId={roomId} />
}

export default function ChatNoticesPage() {
  return (
    <React.Suspense fallback={<RoutePageState kind="loading" />}>
      <ChatNoticesRoute />
    </React.Suspense>
  )
}
