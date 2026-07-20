import * as React from "react"
import Image from "next/image"

import { NoImageProfile } from "@/components/ui/no-image"
import { cn } from "@/lib/utils"

// Figma "Friend" 배지 위치/크기 (44px 아바타 기준 실측): 20.3px 배지가 아바타 우하단 모서리를
// 살짝 벗어나도록 겹쳐 배치됨 — size에 비례해 재계산한다.
const BADGE_RATIO = 20.3 / 44
const BADGE_TOP_RATIO = 0.5962
const BADGE_LEFT_RATIO = 0.6538
// Figma "ChatProfile/L"(96px) 앞 프로필의 흰 테두리 3px — size에 비례하되 목록 크기에서 너무 얇아지지 않게 최소 2px.
const GROUP_BORDER_RATIO = 3 / 96

interface ChatProfileProps extends React.ComponentProps<"div"> {
  src?: string
  alt?: string
  size?: number
  online?: boolean
  /** group: 채팅방/그룹 아바타처럼 두 프로필이 겹쳐 보이는 형태 */
  secondarySrc?: string
  /**
   * 두 프로필을 겹쳐 표시할지 명시적으로 지정한다(3명 이상 방).
   * 2번째 멤버가 프로필 사진이 없어(secondarySrc undefined) 겹침 모드가 꺼지는 것을 막는다.
   * 미지정 시 secondarySrc 유무로 판단한다.
   */
  grouped?: boolean
}

function ChatProfile({
  className,
  src,
  alt = "",
  size = 44,
  online,
  secondarySrc,
  grouped,
  style,
  ...props
}: ChatProfileProps) {
  const isGroup = grouped ?? Boolean(secondarySrc)
  const groupBorderWidth = Math.max(2, Math.round(size * GROUP_BORDER_RATIO))

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
          {secondarySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondarySrc} alt="" className="size-full object-cover" />
          ) : (
            <NoImageProfile />
          )}
        </div>
      )}
      <div
        className={cn(
          "absolute overflow-hidden rounded-full bg-gray-100",
          isGroup && "border-solid border-white"
        )}
        style={
          isGroup
            ? { width: size * 0.63, height: size * 0.63, left: 0, bottom: 0, borderWidth: groupBorderWidth }
            : { inset: 0 }
        }
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : (
          <NoImageProfile />
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
