"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { FriendListPageContent } from "@/features/friends/components/friend-list-page-content"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function FriendsRoute() {
  const searchParams = useSearchParams()
  // 알림 딥링크로 들어오면 요청자 userId 를 받아 해당 "받은 친구요청" 행을 잠깐 강조한다.
  const highlightUserId = parsePositiveInteger(searchParams.get("highlightUserId"))

  return <FriendListPageContent highlightUserId={highlightUserId} />
}

export default function FriendsPage() {
  return (
    <React.Suspense fallback={<FriendListPageContent />}>
      <FriendsRoute />
    </React.Suspense>
  )
}
