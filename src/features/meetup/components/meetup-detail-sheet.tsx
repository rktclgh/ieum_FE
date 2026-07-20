"use client"

import * as React from "react"
import Image from "next/image"
import { Download } from "lucide-react"

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import type { MeetupDetailView } from "@/features/meetup/lib/meetup-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useSaveImage } from "@/lib/hooks/use-save-image"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"

interface MeetupDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: MeetupDetailView | null
  pending: boolean
  error?: string | null
  onJoin: () => void
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
  onEnterRoom,
}: MeetupDetailSheetProps) {
  const { messages } = useTranslation()
  const t = messages.meetup
  const display = detail

  const [imageMenuOpen, setImageMenuOpen] = React.useState(false)
  const saveImageAction = useSaveImage()
  const imageLongPress = useLongPress({ onLongPress: () => setImageMenuOpen(true) })

  // 시트가 닫히면 롱프레스 메뉴도 함께 닫는다(다음에 열 때 메뉴가 떠 있으면 안 된다).
  const handleOpenChange = (next: boolean) => {
    if (!next) setImageMenuOpen(false)
    onOpenChange(next)
  }

  if (!display) return null
  const imageUrl = display.imageUrl
  const hasImage = Boolean(imageUrl)
  const isOpen = display.status === "open"
  // 방장·참여자 모두 시트에선 '채팅방 가기'만 노출한다. 나가기는 채팅방 더보기로 일원화(#249).
  const isJoined = display.isHost || display.myStatus === "joined"
  const closedLabel = display.status === "cancelled" ? t.statusCancelled : t.statusClosed

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      {hasImage ? (
        // 메뉴가 top-full 로 앵커되므로 클리핑(overflow-hidden)은 안쪽 컨테이너에만 남긴다.
        <div
          className={cn(
            "relative w-full",
            LONG_PRESS_TRANSITION,
            imageMenuOpen ? LONG_PRESS_LIFT_ACTIVE : LONG_PRESS_INACTIVE
          )}
          {...imageLongPress}
        >
          <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={t.imageAlt} className="size-full object-cover" />
            <BottomSheetClose
              aria-label={t.closeLabel}
              className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
            >
              <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
            </BottomSheetClose>
          </div>
          {imageMenuOpen && imageUrl ? (
            <ChatContextMenu
              items={[
                {
                  icon: <Download className="size-6 text-gray-900" />,
                  label: messages.common.saveImage,
                  onClick: () => {
                    setImageMenuOpen(false)
                    void saveImageAction.save(imageUrl)
                  },
                },
              ]}
              dimmed
              onDismiss={() => setImageMenuOpen(false)}
              className="top-full left-1/2 mt-3 -translate-x-1/2"
            />
          ) : null}
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

      {/* 액션: 참여(방장·멤버) 여부에 따라 분기. 나가기는 채팅방 더보기에서만 처리한다. */}
      <div className="flex w-full flex-col gap-2">
        {isJoined ? (
          <Button variant="primary" size="block" disabled={pending} onClick={onEnterRoom}>
            {t.enterRoomButton}
          </Button>
        ) : (
          <Button variant="primary" size="block" disabled={pending || !isOpen} onClick={onJoin}>
            {isOpen ? t.joinButton : closedLabel}
          </Button>
        )}
      </div>
      <Toast open={saveImageAction.failed} message={messages.common.saveImageFailed} />
    </BottomSheet>
  )
}

export { MeetupDetailSheet }
