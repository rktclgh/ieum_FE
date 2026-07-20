"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatRoomMoreHeaderProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  showNotificationAction?: boolean
  showPinAction?: boolean
  notificationPending?: boolean
  pinPending?: boolean
  notificationOn: boolean
  onToggleNotification: () => void
  pinned: boolean
  onTogglePin: () => void
}

function ChatRoomMoreHeader({
  className,
  onBack,
  showNotificationAction = true,
  showPinAction = true,
  notificationPending = false,
  pinPending = false,
  notificationOn,
  onToggleNotification,
  pinned,
  onTogglePin,
  ...props
}: ChatRoomMoreHeaderProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="chat-room-more-header"
      className={cn("flex w-full shrink-0 items-center justify-between border-b border-gray-50 px-4 pb-4 pt-[calc(1rem+var(--safe-area-top))]", className)}
      {...props}
    >
      <button
        type="button"
        aria-label={messages.common.back}
        onClick={onBack}
        className="flex size-6 shrink-0 items-center justify-center"
      >
        <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
      </button>
      {(showNotificationAction || showPinAction) && (
        <div className="flex items-center gap-3">
          {showNotificationAction && (
            <button
              type="button"
              aria-label={
                notificationOn
                  ? messages.chat.disableNotificationAction
                  : messages.chat.enableNotificationAction
              }
              aria-pressed={notificationOn}
              aria-busy={notificationPending}
              disabled={notificationPending}
              onClick={onToggleNotification}
              className="flex size-6 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src={notificationOn ? "/icons/chat/alarm-on.svg" : "/icons/chat/alarm-off.svg"}
                alt=""
                width={24}
                height={24}
                className="size-6"
              />
            </button>
          )}
          {showPinAction && (
            <button
              type="button"
              aria-label={messages.chat.pinAction}
              aria-pressed={pinned}
              aria-busy={pinPending}
              disabled={pinPending}
              onClick={onTogglePin}
              className="flex size-6 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src={pinned ? "/icons/chat/pin-on.svg" : "/icons/chat/pin-off.svg"}
                alt=""
                width={24}
                height={24}
                className="size-6"
              />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { ChatRoomMoreHeader }
