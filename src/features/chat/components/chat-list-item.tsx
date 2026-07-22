"use client"

import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface ChatListItemProps extends React.ComponentProps<"button"> {
  avatarSrc?: string
  secondaryAvatarSrc?: string
  grouped?: boolean
  online?: boolean
  title: string
  /** 검색어와 일치하는 부분을 강조 표시 (채팅목록 검색) */
  highlightQuery?: string
  memberCount?: number
  lastMessage?: string
  time?: string
  unreadCount?: number
  pinned?: boolean
  /** 롱프레스 메뉴가 열려 있는 동안 딤 오버레이 위로 떠 보이도록 강조 */
  active?: boolean
}

function ChatListItem({
  className,
  avatarSrc,
  secondaryAvatarSrc,
  grouped,
  online,
  title,
  highlightQuery,
  memberCount,
  lastMessage,
  time,
  unreadCount,
  pinned,
  active,
  ...props
}: ChatListItemProps) {
  const hasUnread = Boolean(unreadCount && unreadCount > 0)
  const titleRef = React.useRef<HTMLSpanElement>(null)
  const [titleTruncated, setTitleTruncated] = React.useState(false)

  React.useEffect(() => {
    const el = titleRef.current
    if (!el) return

    const checkTruncated = () => setTitleTruncated(el.scrollWidth > el.clientWidth)
    checkTruncated()

    const observer = new ResizeObserver(checkTruncated)
    observer.observe(el)
    return () => observer.disconnect()
  }, [title])

  return (
    <button
      type="button"
      data-slot="chat-list-item"
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left",
        LONG_PRESS_TRANSITION,
        active ? cn(LONG_PRESS_SURFACE_ACTIVE, "gap-2 px-3") : LONG_PRESS_INACTIVE,
        className
      )}
      {...props}
    >
      <ChatProfile
        src={avatarSrc}
        secondarySrc={secondaryAvatarSrc}
        grouped={grouped}
        online={online}
        size={active ? 40 : 44}
        className={LONG_PRESS_TRANSITION}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex w-full min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-2">
            {pinned && (
              <Icon name="chat/title-pin" width={20} height={20} className="size-5 shrink-0" />
            )}
            <span
              ref={titleRef}
              className={cn(
                "min-w-0 truncate text-gray-900",
                LONG_PRESS_TRANSITION,
                active ? "text-body-semibold-15" : "text-title-semibold-16"
              )}
            >
              <HighlightedText text={title} query={highlightQuery} />
            </span>
          </div>
          {memberCount !== undefined && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-gray-400",
                LONG_PRESS_TRANSITION,
                active ? "text-body-semibold-15" : "text-title-semibold-16",
                !titleTruncated && "ml-2"
              )}
            >
              {memberCount}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={cn(
              "truncate text-gray-400",
              LONG_PRESS_TRANSITION,
              active ? "text-body-regular-13" : "text-body-regular-14"
            )}
          >
            {lastMessage}
          </p>
        )}
      </div>
      <div className="flex h-11 shrink-0 flex-col items-end gap-0.5 py-px">
        {time && (
          <span className="whitespace-nowrap text-body-regular-12 text-gray-200">{time}</span>
        )}
        {hasUnread && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-body-regular-12 text-white">
            {unreadCount}
          </span>
        )}
      </div>
    </button>
  )
}

export { ChatListItem }
