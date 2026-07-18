"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatRoomDangerActionsProps extends React.ComponentProps<"div"> {
  /** 방장에게는 전달하지 않아 '나가기'를 숨긴다(주인 없는 방 방지 — 방장은 해체만). */
  onLeave?: () => void
  leaveLabel?: string
  /** 방장에게만 노출되는 채팅방 해체 액션 */
  onDisband?: () => void
}

function ChatRoomDangerActions({
  className,
  onLeave,
  leaveLabel,
  onDisband,
  ...props
}: ChatRoomDangerActionsProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="chat-room-danger-actions"
      className={cn("flex flex-col gap-1 rounded-2xl bg-gray-50 py-3", className)}
      {...props}
    >
      {onLeave && (
        <button type="button" onClick={onLeave} className="flex items-center px-4 py-2 text-left">
          <span className="text-body-medium-16 text-red">{leaveLabel ?? messages.chat.leaveChatAction}</span>
        </button>
      )}
      {onDisband && (
        <button type="button" onClick={onDisband} className="flex items-center px-4 py-2 text-left">
          <span className="text-body-medium-16 text-red">{messages.chat.disbandChatAction}</span>
        </button>
      )}
    </div>
  )
}

export { ChatRoomDangerActions }
