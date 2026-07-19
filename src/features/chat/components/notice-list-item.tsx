import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface NoticeListItemProps extends React.ComponentProps<"div"> {
  title: string
  authorName: string
  authorAvatarSrc?: string
  time: string
  /** 채팅방 공지로 고정된 항목: 제목 앞에 핀 아이콘 표시 */
  pinned?: boolean
  /** 롱프레스 메뉴가 열린 항목: 딤 위로 떠오르는 리프트 표시 */
  active?: boolean
}

function NoticeListItem({ className, title, authorName, authorAvatarSrc, time, pinned, active, ...props }: NoticeListItemProps) {
  return (
    <div
      data-slot="notice-list-item"
      className={cn(
        "flex w-full items-start gap-3 py-3",
        LONG_PRESS_TRANSITION,
        active ? cn(LONG_PRESS_SURFACE_ACTIVE, "px-3") : LONG_PRESS_INACTIVE,
        className
      )}
      {...props}
    >
      <ChatProfile src={authorAvatarSrc} size={active ? 36 : 40} className={LONG_PRESS_TRANSITION} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="text-body-medium-15 break-words text-gray-900">
          {pinned && (
            <Image
              src="/icons/chat/title-pin.svg"
              alt=""
              width={15}
              height={15}
              // 글자 크기(15px)에 맞춰 제목 첫 줄 앞에 인라인 배치
              className="mr-1 inline-block size-[1em] translate-y-[0.1em] align-baseline"
            />
          )}
          {title}
        </p>
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-body-regular-13 text-gray-400">{authorName}</span>
          <span className="size-[3px] shrink-0 rounded-full bg-gray-400" />
          <span className="whitespace-nowrap text-body-regular-13 text-gray-400">{time}</span>
        </div>
      </div>
    </div>
  )
}

export { NoticeListItem }
