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
}

/** 모임 상세 단일 바텀시트. 본문은 MeetupDetailCard(겹친 핀 캐러셀과 공유)가 그린다. */
function MeetupDetailSheet({ open, onOpenChange, detail, ...cardProps }: MeetupDetailSheetProps) {
  if (!detail) return null

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <MeetupDetailCard detail={detail} {...cardProps} />
    </BottomSheet>
  )
}

export { MeetupDetailSheet }
