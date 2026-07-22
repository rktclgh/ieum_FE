"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { ChatRoomPageContent } from "@/features/chat/components/chat-room-page-content"
import { parseChatRoomEntry } from "@/features/chat/lib/chat-room-navigation"
import { ChatRoomSkeleton } from "@/features/chat/components/chat-room-skeleton"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function ChatRoomRoute() {
  const searchParams = useSearchParams()
  const roomId = parsePositiveInteger(searchParams.get("chatId"))
  const entry = parseChatRoomEntry(searchParams.get("entry"))

  if (roomId === null) return <RoutePageState kind="invalid-link" />

  return <ChatRoomPageContent key={roomId} roomId={roomId} entry={entry} />
}

export default function ChatRoomPage() {
  return (
    <React.Suspense fallback={<ChatRoomSkeleton />}>
      <ChatRoomRoute />
    </React.Suspense>
  )
}
