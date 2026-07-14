import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

// Figma "Friend" 배지 위치/크기 (44px 아바타 기준 실측): 20.3px 배지가 아바타 우하단 모서리를
// 살짝 벗어나도록 겹쳐 배치됨 — size에 비례해 재계산한다.
const BADGE_RATIO = 20.3 / 44
const BADGE_TOP_RATIO = 0.5962
const BADGE_LEFT_RATIO = 0.6538

interface ChatProfileProps extends React.ComponentProps<"div"> {
  src?: string
  alt?: string
  size?: number
  online?: boolean
  /** group: 채팅방/그룹 아바타처럼 두 프로필이 겹쳐 보이는 형태 */
  secondarySrc?: string
}

function ChatProfile({
  className,
  src,
  alt = "",
  size = 44,
  online,
  secondarySrc,
  style,
  ...props
}: ChatProfileProps) {
  const isGroup = Boolean(secondarySrc)

  return (
    <div
      data-slot="chat-profile"
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {isGroup && (
        <div
          className="absolute top-0 right-0 overflow-hidden rounded-full bg-gray-100"
          style={{ width: size * 0.63, height: size * 0.63 }}
        >
          {secondarySrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondarySrc} alt="" className="size-full object-cover" />
          )}
        </div>
      )}
      <div
        className={cn(
          "absolute overflow-hidden rounded-full bg-gray-100",
          isGroup && "border-2 border-white"
        )}
        style={
          isGroup
            ? { width: size * 0.63, height: size * 0.63, left: 0, bottom: 0 }
            : { inset: 0 }
        }
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="size-full object-cover" />
        )}
      </div>
      {!isGroup && online !== undefined && (
        <div
          className="absolute"
          style={{
            width: size * BADGE_RATIO,
            height: size * BADGE_RATIO,
            top: size * BADGE_TOP_RATIO,
            left: size * BADGE_LEFT_RATIO,
          }}
        >
          <Image src={online ? "/icons/chat/status-online.svg" : "/icons/chat/status-offline.svg"} alt="" fill />
        </div>
      )}
    </div>
  )
}

export { ChatProfile }
