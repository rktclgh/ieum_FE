"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatRoomInfoSectionProps extends React.ComponentProps<"div"> {
  onNoticeClick?: () => void
  onScheduleClick?: () => void
}

function ChatRoomInfoSection({ className, onNoticeClick, onScheduleClick, ...props }: ChatRoomInfoSectionProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="chat-room-info-section"
      className={cn("flex flex-col gap-1 rounded-2xl bg-gray-50 py-3", className)}
      {...props}
    >
      <button type="button" onClick={onNoticeClick} className="flex items-center gap-2 px-4 py-2">
        <Image src="/icons/chat/notification.svg" alt="" width={24} height={24} className="size-6" />
        <span className="text-body-medium-16 text-gray-900">{messages.chat.noticeLabel}</span>
      </button>
      <button type="button" onClick={onScheduleClick} className="flex items-center gap-2 px-4 py-2">
        <Image src="/icons/chat/calendar.svg" alt="" width={24} height={24} className="size-6" />
        <span className="text-body-medium-16 text-gray-900">{messages.chat.scheduleLabel}</span>
      </button>
    </div>
  )
}

export { ChatRoomInfoSection }
