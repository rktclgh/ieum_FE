"use client"

import * as React from "react"

import { useLongPress } from "@/features/chat/hooks/use-long-press"
import type { NotificationEntry } from "@/features/notification/lib/notification-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationItemProps {
  entry: NotificationEntry
  onOpen: () => void
  onLongPress: () => void
  /** 컨텍스트 메뉴가 열린 행 — 채팅 목록과 동일하게 제자리에서 부상시킨다. */
  active?: boolean
}

// 알림 한 줄 — 탭하면 읽음 처리 후 딥링크 이동, 롱프레스로 삭제 메뉴. 안 읽은 알림은 점으로 강조.
function NotificationItem({ entry, onOpen, onLongPress, active }: NotificationItemProps) {
  const { messages } = useTranslation()
  const longPress = useLongPress({ onLongPress })
  // 상대시각 문구는 question 카탈로그의 공용 포맷터를 재사용한다.
  const timeLabel = formatRelativeTime(entry.createdAt, messages.question)

  return (
    <button
      type="button"
      onClick={onOpen}
      {...longPress}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ease-out",
        entry.isRead ? "bg-white" : "bg-primary/10",
        active
          ? "relative z-50 -translate-y-1 scale-[1.02] shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]"
          : "translate-y-0 scale-100 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.05)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          entry.isRead ? "bg-transparent" : "bg-primary"
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {entry.isAiAnswer !== null ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-body-medium-12",
                entry.isAiAnswer
                  ? "bg-primary-50 text-primary-700"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {entry.isAiAnswer
                ? messages.notification.aiAnswerSourceLabel
                : messages.notification.humanAnswerSourceLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              entry.isRead
                ? "text-body-medium-15 text-gray-700"
                : "text-title-semibold-16 text-gray-900"
            )}
          >
            {entry.title}
          </span>
        </div>
        {entry.body ? (
          <span className="line-clamp-2 text-body-regular-14 text-gray-500">{entry.body}</span>
        ) : null}
        {timeLabel ? (
          <span className="text-body-regular-13 text-gray-400">{timeLabel}</span>
        ) : null}
      </div>
    </button>
  )
}

export { NotificationItem }
