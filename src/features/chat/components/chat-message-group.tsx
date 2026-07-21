import * as React from "react"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface ChatMessageGroupProps {
  sender: "me" | "others"
  name?: string
  time?: string
  avatarSrc?: string
  children: React.ReactNode
}

/** 같은 발신자·같은 분 연속 메시지(run) 한 묶음의 chrome: 아바타/이름/시각 1회. */
function ChatMessageGroup({ sender, name, time, avatarSrc, children }: ChatMessageGroupProps) {
  const isMe = sender === "me"
  return (
    <div className={cn("flex w-full items-end gap-2 py-2", isMe && "justify-end")}>
      {!isMe && <ChatProfile src={avatarSrc} size={26} />}
      <div className={cn("flex min-w-0 max-w-[75%] flex-col gap-1", isMe ? "items-end" : "items-start")}>
        {!isMe && name && <p className="text-body-regular-12 text-gray-400">{name}</p>}
        {children}
        {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
      </div>
    </div>
  )
}

export { ChatMessageGroup }
