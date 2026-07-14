import * as React from "react"

import { cn } from "@/lib/utils"

type BubblePosition = "solo" | "first" | "middle" | "last"

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

function bubblePosition(index: number, total: number): BubblePosition {
  if (total <= 1) return "solo"
  if (index === 0) return "first"
  if (index === total - 1) return "last"
  return "middle"
}

interface ChatBubbleSegmentProps extends React.ComponentProps<"div"> {
  sender: "me" | "others"
  text: string
  position: BubblePosition
  variant: "long" | "short"
}

/** 그룹 내 단일 메시지 말풍선. 이름/아바타/시각은 상위 ChatMessageGroup이 담당한다. */
function ChatBubbleSegment({ className, sender, text, position, variant, ...props }: ChatBubbleSegmentProps) {
  const isMe = sender === "me"
  const radiusMap = isMe ? ME_RADIUS : OTHERS_RADIUS
  return (
    <div
      data-slot="chat-bubble-segment"
      className={cn(
        "px-4 py-3",
        isMe ? "bg-primary-400" : "bg-gray-50",
        radiusMap[position],
        variant === "long" && "w-[253px] max-w-full",
        className
      )}
      {...props}
    >
      <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{text}</p>
    </div>
  )
}

export { ChatBubbleSegment, bubblePosition, ME_RADIUS, OTHERS_RADIUS }
export type { BubblePosition }
