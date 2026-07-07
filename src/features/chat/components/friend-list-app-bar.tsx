"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Circle } from "@/components/ui/circle"
import { useTranslation } from "@/lib/i18n/use-translation"

interface FriendListAppBarProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  onAddFriend?: () => void
}

function FriendListAppBar({ className, onBack, onAddFriend, ...props }: FriendListAppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="friend-list-app-bar"
      className={cn("relative flex h-[62px] w-full items-center justify-between p-4", className)}
      {...props}
    >
      <button
        type="button"
        aria-label="뒤로 가기"
        onClick={onBack}
        className="flex size-6 shrink-0 items-center justify-center"
      >
        <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
      </button>
      <p className="-translate-x-1/2 absolute left-1/2 text-title-semibold-18 text-gray-900">
        {messages.chat.myFriendsTitle}
      </p>
      <Circle iconSrc="/icons/circle/add-friend.svg" onClick={onAddFriend} aria-label={messages.chat.addFriendTitle} />
    </div>
  )
}

export { FriendListAppBar }
