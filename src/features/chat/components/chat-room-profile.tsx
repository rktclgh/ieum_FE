import * as React from "react"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface ChatRoomProfileProps extends React.ComponentProps<"div"> {
  avatarSrc?: string
  secondaryAvatarSrc?: string
  grouped?: boolean
  title: string
}

function ChatRoomProfile({ className, avatarSrc, secondaryAvatarSrc, grouped, title, ...props }: ChatRoomProfileProps) {
  return (
    <div
      data-slot="chat-room-profile"
      className={cn("flex flex-col items-center gap-3 pt-2 pb-6", className)}
      {...props}
    >
      <ChatProfile src={avatarSrc} secondarySrc={secondaryAvatarSrc} grouped={grouped} size={96} />
      <p className="text-title-semibold-20 text-gray-900">{title}</p>
    </div>
  )
}

export { ChatRoomProfile }
