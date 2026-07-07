"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface ChatListItemProps extends React.ComponentProps<"button"> {
  avatarSrc?: string
  secondaryAvatarSrc?: string
  online?: boolean
  title: string
  memberCount?: number
  lastMessage?: string
  time?: string
  unreadCount?: number
  pinned?: boolean
}

function ChatListItem({
  className,
  avatarSrc,
  secondaryAvatarSrc,
  online,
  title,
  memberCount,
  lastMessage,
  time,
  unreadCount,
  pinned,
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
      className={cn("flex w-full items-center gap-3 py-3 text-left", className)}
      {...props}
    >
      <ChatProfile src={avatarSrc} secondarySrc={secondaryAvatarSrc} online={online} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex w-full min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-2">
            {pinned && (
              <Image src="/icons/chat/title-pin.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
            )}
            <span ref={titleRef} className="min-w-0 truncate text-title-semibold-16 text-gray-900">
              {title}
            </span>
          </div>
          {memberCount !== undefined && (
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-title-semibold-16 text-gray-400",
                !titleTruncated && "ml-2"
              )}
            >
              {memberCount}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="truncate text-body-regular-14 text-gray-400">{lastMessage}</p>
        )}
      </div>
      <div className="flex h-11 shrink-0 flex-col items-end gap-0.5 py-px">
        {time && (
          <span
            className={cn(
              "whitespace-nowrap text-body-regular-12",
              hasUnread ? "text-primary-400" : "text-gray-200"
            )}
          >
            {time}
          </span>
        )}
        {hasUnread && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-400 text-body-regular-12 text-white">
            {unreadCount}
          </span>
        )}
      </div>
    </button>
  )
}

export { ChatListItem }
