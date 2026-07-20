"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationDeleteBarProps extends React.ComponentProps<"div"> {
  onDeleteAll?: () => void
  onClose?: () => void
  deleteAllDisabled?: boolean
}

// 삭제 모드 액션 바 — 목록 위 Gray/50 띠에 "전체 삭제 / 닫기" 우측 정렬(시안 1835:11292).
function NotificationDeleteBar({
  className,
  onDeleteAll,
  onClose,
  deleteAllDisabled,
  ...props
}: NotificationDeleteBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="notification-delete-bar"
      className={cn(
        "flex w-full items-center justify-end gap-4 bg-gray-50 px-4 py-3 text-body-medium-14",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={onDeleteAll}
        disabled={deleteAllDisabled}
        className="text-gray-900 disabled:text-gray-300"
      >
        {messages.notification.deleteAll}
      </button>
      <button type="button" onClick={onClose} className="text-gray-900">
        {messages.notification.deleteModeClose}
      </button>
    </div>
  )
}

export { NotificationDeleteBar }
