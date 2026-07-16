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
  /** 이미지 메시지면 렌더할 이미지 URL. 있으면 텍스트 대신 이미지 말풍선으로 그린다. */
  imageUrl?: string
  imageAlt?: string
  /** 업로드 중인 낙관적 이미지 말풍선. 흐리게 표시한다. */
  uploading?: boolean
}

/** 그룹 내 단일 메시지 말풍선. 이름/아바타/시각은 상위 ChatMessageGroup이 담당한다. */
function ChatBubbleSegment({
  className,
  sender,
  text,
  position,
  variant,
  imageUrl,
  imageAlt,
  uploading = false,
  ...props
}: ChatBubbleSegmentProps) {
  const isMe = sender === "me"
  const radiusMap = isMe ? ME_RADIUS : OTHERS_RADIUS

  // 낙관적 이미지 말풍선의 blob: 미리보기 URL은 서버 에코로 대체되며 언마운트될 때
  // 해제해야 메모리 누수를 막는다. (전송 성공/실패/페이지 이탈 모든 경로를 커버)
  React.useEffect(() => {
    return () => {
      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  if (imageUrl) {
    return (
      <div
        data-slot="chat-bubble-segment"
        className={cn(
          "relative w-[200px] max-w-full overflow-hidden bg-gray-50",
          radiusMap[position],
          uploading && "opacity-60",
          className
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={imageAlt} className="block w-full object-cover" />
        {uploading && (
          <span className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
      </div>
    )
  }

  return (
    <div
      data-slot="chat-bubble-segment"
      className={cn(
        "px-4 py-3",
        isMe ? "bg-primary" : "bg-gray-50",
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
