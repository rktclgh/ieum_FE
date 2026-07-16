"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationListAppBarProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  onReadAll?: () => void
  readAllDisabled?: boolean
}

// 알림센터 상단바 — 뒤로가기 + 제목 + "전체 읽음". 미읽음이 없으면 전체읽음 비활성화.
function NotificationListAppBar({
  className,
  onBack,
  onReadAll,
  readAllDisabled,
  ...props
}: NotificationListAppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="notification-list-app-bar"
      className={cn("relative flex h-[62px] w-full items-center justify-between p-4", className)}
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
        {messages.notification.appBarTitle}
      </p>
      <button
        type="button"
        onClick={onReadAll}
        disabled={readAllDisabled}
        className="shrink-0 text-body-medium-14 text-primary disabled:text-gray-300"
      >
        {messages.notification.readAllButton}
      </button>
    </div>
  )
}

export { NotificationListAppBar }
