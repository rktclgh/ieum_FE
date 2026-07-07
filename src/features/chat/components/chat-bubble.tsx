import * as React from "react"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

type ChatBubbleSender = "me" | "others"
type ChatBubbleVariant = "long" | "short" | "multiple" | "reply"

interface ChatBubbleProps extends React.ComponentProps<"div"> {
  sender: ChatBubbleSender
  variant: ChatBubbleVariant
  /** others 전용: 그룹 채팅에서 보낸 사람 이름 */
  name?: string
  avatarSrc?: string
  /** long/short: 1개, multiple: 최대 3개 (한 그룹으로 이어붙여 렌더) */
  texts?: string[]
  /** reply 전용 */
  replyLabel?: string
  replyQuote?: string
  replyText?: string
  time?: string
}

const OTHERS_RADIUS = {
  solo: "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl",
  first: "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl",
  middle: "rounded-tl-[4px] rounded-tr-3xl rounded-bl-[4px] rounded-br-3xl",
  last: "rounded-tr-3xl rounded-bl-3xl rounded-br-3xl",
} as const

const ME_RADIUS = {
  solo: "rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl",
  first: "rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]",
  middle: "rounded-tl-3xl rounded-bl-3xl",
  last: "rounded-tl-3xl rounded-bl-3xl rounded-br-3xl",
} as const

function bubblePosition(index: number, total: number): "solo" | "first" | "middle" | "last" {
  if (total <= 1) return "solo"
  if (index === 0) return "first"
  if (index === total - 1) return "last"
  return "middle"
}

function ChatBubble({
  className,
  sender,
  variant,
  name,
  avatarSrc,
  texts = [],
  replyLabel,
  replyQuote,
  replyText,
  time,
  ...props
}: ChatBubbleProps) {
  const isMe = sender === "me"
  const isReply = variant === "reply"
  const isLong = variant === "long"
  const radiusMap = isMe ? ME_RADIUS : OTHERS_RADIUS

  if (isReply) {
    return (
      <div
        data-slot="chat-bubble"
        className={cn(
          "flex w-full items-end gap-2 py-2",
          isMe ? "flex-col items-end gap-1" : "",
          className
        )}
        {...props}
      >
        {!isMe && <ChatProfile src={avatarSrc} size={26} />}
        <div className={cn("flex flex-col items-start gap-1", isMe ? "w-full items-end" : "flex-1")}>
          <p
            className={cn(
              "text-body-regular-12 text-gray-400",
              isMe && "w-full text-right text-body-regular-13"
            )}
          >
            {replyLabel}
          </p>
          <div
            className={cn(
              "bg-gray-200 px-4 py-3",
              isMe ? "rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl" : "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl"
            )}
          >
            <p className="text-body-regular-14 text-gray-700">{replyQuote}</p>
          </div>
          <div
            className={cn(
              "px-4 py-3",
              isMe ? "rounded-3xl bg-primary-400" : "rounded-tr-3xl rounded-bl-3xl rounded-br-3xl bg-gray-50"
            )}
          >
            <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{replyText}</p>
          </div>
          {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="chat-bubble"
      className={cn("flex w-full items-end gap-2 py-2", isMe && "justify-end", className)}
      {...props}
    >
      {!isMe && <ChatProfile src={avatarSrc} size={26} />}
      <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "w-[309px] items-start")}>
        {!isMe && name && <p className="text-body-regular-12 text-gray-400">{name}</p>}
        {texts.map((text, index) => (
          <div
            key={index}
            className={cn(
              "px-4 py-3",
              isMe ? "bg-primary-400" : "bg-gray-50",
              radiusMap[bubblePosition(index, texts.length)],
              isLong && "w-[253px]"
            )}
          >
            <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{text}</p>
          </div>
        ))}
        {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
      </div>
    </div>
  )
}

export { ChatBubble }
export type { ChatBubbleSender, ChatBubbleVariant }
