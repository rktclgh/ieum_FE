"use client"

import * as React from "react"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import { MeetupDetailCard } from "@/features/meetup/components/meetup-detail-card"
import type { MeetupDetailView } from "@/features/meetup/lib/meetup-adapter"

interface MeetupDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: MeetupDetailView | null
  pending: boolean
  error?: string | null
  onJoin: () => void
  onEnterRoom: () => void
  /** 번역 메뉴 노출 조건. 카드로 그대로 전달한다. */
  isAuthenticated?: boolean
}

/**
 * 모임 상세 단일 바텀시트. 본문은 MeetupDetailCard(겹친 핀 캐러셀과 공유)가 그린다.
 *
 * 히어로 이미지 롱프레스 메뉴(#331)는 카드가 소유하므로, 시트가 닫히면 카드에 `active=false`로
 * 알려 메뉴를 함께 닫는다 — 다음에 열었을 때 메뉴가 떠 있으면 안 된다.
 */
function MeetupDetailSheet({ open, onOpenChange, detail, ...cardProps }: MeetupDetailSheetProps) {
  if (!detail) return null

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <MeetupDetailCard detail={detail} active={open} {...cardProps} />
    </BottomSheet>
  )
}

export { MeetupDetailSheet }
