"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { APP_BAR_SAFE_TOP } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"

interface FriendListAppBarProps extends React.ComponentProps<"div"> {
  onBack?: () => void
}

function FriendListAppBar({ className, onBack, ...props }: FriendListAppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="friend-list-app-bar"
      // issue #279: safe-area 패딩이 붙으면 고정 높이는 내용물을 눌러버리므로 min-h로 바꿔 아래로 자란다.
      className={cn(
        "relative flex min-h-[62px] w-full items-center justify-between px-4 pb-4",
        APP_BAR_SAFE_TOP,
        className
      )}
      {...props}
    >
      <button
        type="button"
        aria-label={messages.common.back}
        onClick={onBack}
        className="flex size-6 shrink-0 items-center justify-center"
      >
        <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
      </button>
      <p className="-translate-x-1/2 absolute left-1/2 text-title-semibold-18 text-gray-900">
        {messages.chat.myFriendsTitle}
      </p>
      <div className="size-6 shrink-0" aria-hidden />
    </div>
  )
}

export { FriendListAppBar }
