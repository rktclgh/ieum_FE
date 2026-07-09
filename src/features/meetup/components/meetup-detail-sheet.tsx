"use client"

import * as React from "react"
import Image from "next/image"

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import type { MeetupSummary } from "@/features/meetup/types"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetup: MeetupSummary
  onJoin?: () => void
}

function InfoRow({ iconSrc, children }: { iconSrc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <Image src={iconSrc} alt="" width={18} height={18} className="size-[18px]" />
      <span className="text-body-regular-14 text-gray-600">{children}</span>
    </div>
  )
}

function MeetupDetailSheet({ open, onOpenChange, meetup, onJoin }: MeetupDetailSheetProps) {
  const { messages } = useTranslation()
  const hasImage = Boolean(meetup.imageUrl)

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {hasImage ? (
        <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meetup.imageUrl} alt={messages.meetup.imageAlt} className="size-full object-cover" />
          <BottomSheetClose
            aria-label={messages.meetup.closeLabel}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
          >
            <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
          </BottomSheetClose>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-title-semibold-18 text-gray-900">{meetup.title}</h2>
          {!hasImage ? (
            <BottomSheetClose
              aria-label={messages.meetup.closeLabel}
              className="flex size-6 shrink-0 items-center justify-center"
            >
              <Image src="/icons/app-bar/close.svg" alt="" width={24} height={24} className="size-6" />
            </BottomSheetClose>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <InfoRow iconSrc="/icons/meetup/time.svg">{meetup.dateLabel}</InfoRow>
            <InfoRow iconSrc="/icons/meetup/location.svg">{meetup.locationLabel}</InfoRow>
          </div>
          <InfoRow iconSrc="/icons/meetup/people.svg">
            {messages.meetup.participantCount(meetup.participantCount)}
          </InfoRow>
        </div>
      </div>

      <p className="w-full text-body-regular-14 whitespace-pre-line text-gray-600">{meetup.description}</p>

      <Button variant="primary" size="block" onClick={onJoin}>
        {messages.meetup.joinButton}
      </Button>
    </BottomSheet>
  )
}

export { MeetupDetailSheet }
