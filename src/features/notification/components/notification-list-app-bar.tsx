"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationListAppBarProps extends React.ComponentProps<"div"> {
  onBack?: () => void
  onEnterDeleteMode?: () => void
  onOpenSettings?: () => void
  deleteMode?: boolean
}

// 알림센터 상단바 — 뒤로가기 + 가운데 제목 + 우측 쓰레기통·톱니.
// 쓰레기통은 삭제 모드 진입용이라 삭제 모드에서는 숨기고 톱니만 남긴다(시안 1835:11204).
function NotificationListAppBar({
  className,
  onBack,
  onEnterDeleteMode,
  onOpenSettings,
  deleteMode,
  ...props
}: NotificationListAppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="notification-list-app-bar"
      className={cn("relative flex h-[57px] w-full items-center justify-between p-4", className)}
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

      <div className="flex shrink-0 items-center gap-3">
        {!deleteMode && (
          <button
            type="button"
            aria-label={messages.notification.deleteModeLabel}
            onClick={onEnterDeleteMode}
            className="flex size-6 shrink-0 items-center justify-center"
          >
            <Image
              src="/icons/app-bar/trash.svg"
              alt=""
              width={24}
              height={24}
              className="size-6"
            />
          </button>
        )}
        <button
          type="button"
          aria-label={messages.notification.settingsLabel}
          onClick={onOpenSettings}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image
            src="/icons/app-bar/setting.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
        </button>
      </div>
    </div>
  )
}

export { NotificationListAppBar }
