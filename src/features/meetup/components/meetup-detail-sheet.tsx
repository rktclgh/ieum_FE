"use client"

import * as React from "react"
import Image from "next/image"

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import type { MeetupDetailView } from "@/features/meetup/lib/meetup-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: MeetupDetailView | null
  pending: boolean
  error?: string | null
  onJoin: () => void
  onLeave: () => void
  onEnterRoom: () => void
}

function InfoRow({ iconSrc, children }: { iconSrc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <Image src={iconSrc} alt="" width={18} height={18} className="size-[18px]" />
      <span className="text-body-regular-14 text-gray-600">{children}</span>
    </div>
  )
}

function MeetupDetailSheet({
  open,
  onOpenChange,
  detail,
  pending,
  error,
  onJoin,
  onLeave,
  onEnterRoom,
}: MeetupDetailSheetProps) {
  const { messages } = useTranslation()
  const t = messages.meetup
  const display = detail

  if (!display) return null
  const hasImage = Boolean(display.imageUrl)
  const isOpen = display.status === "open"
  const isHost = display.isHost
  const isMember = display.myStatus === "joined"
  const closedLabel = display.status === "cancelled" ? t.statusCancelled : t.statusClosed

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {hasImage ? (
        <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={display.imageUrl} alt={t.imageAlt} className="size-full object-cover" />
          <BottomSheetClose
            aria-label={t.closeLabel}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
          >
            <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
          </BottomSheetClose>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-title-semibold-18 text-gray-900">{display.title}</h2>
          {!hasImage ? (
            <BottomSheetClose
              aria-label={t.closeLabel}
              className="flex size-6 shrink-0 items-center justify-center"
            >
              <Image src="/icons/app-bar/close.svg" alt="" width={24} height={24} className="size-6" />
            </BottomSheetClose>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <InfoRow iconSrc="/icons/meetup/time.svg">{display.dateLabel || t.noSchedule}</InfoRow>
            <InfoRow iconSrc="/icons/meetup/location.svg">{display.locationLabel}</InfoRow>
          </div>
          <InfoRow iconSrc="/icons/meetup/people.svg">
            {t.participantCount(display.participantCount)}
          </InfoRow>
        </div>
      </div>

      {display.description ? (
        <p className="w-full text-body-regular-14 whitespace-pre-line text-gray-600">{display.description}</p>
      ) : null}

      {error ? <p className="w-full text-body-regular-12 text-red">{error}</p> : null}

      {/* 액션: myStatus 에 따라 분기 */}
      <div className="flex w-full flex-col gap-2">
        {isHost ? (
          <Button variant="primary" size="block" disabled={pending} onClick={onEnterRoom}>
            {t.enterRoomButton}
          </Button>
        ) : isMember ? (
          <>
            <Button variant="primary" size="block" disabled={pending} onClick={onEnterRoom}>
              {t.enterRoomButton}
            </Button>
            <Button variant="secondary" size="block" disabled={pending} onClick={onLeave}>
              {t.leaveButton}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="block" disabled={pending || !isOpen} onClick={onJoin}>
            {isOpen ? t.joinButton : closedLabel}
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}

export { MeetupDetailSheet }
