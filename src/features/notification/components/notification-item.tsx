"use client"

import * as React from "react"
import Image from "next/image"

import type { NotificationEntry } from "@/features/notification/lib/notification-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NotificationItemProps {
  entry: NotificationEntry
  onOpen: () => void
  deleteMode?: boolean
  onDelete?: () => void
}

// 알림 한 줄 — 제목(Primary/400 13) · 본문(Gray/900 14) · 시각(Gray/400 12) 세로 스택.
// 탭하면 읽음 처리 후 딥링크 이동. 삭제 모드에서는 우상단 X 로 단건 삭제한다(시안 1835:11154).
// 이미 읽은 알림은 제목을 Gray/400 으로 낮춰 미읽음과 구분한다.
function NotificationItem({ entry, onOpen, deleteMode, onDelete }: NotificationItemProps) {
  const { messages } = useTranslation()
  // 상대시각 문구는 question 카탈로그의 공용 포맷터를 재사용한다.
  const timeLabel = formatRelativeTime(entry.createdAt, messages.question)

  return (
    <div className="relative w-full">
      {/* 삭제 모드에서는 본문 탭으로 딥링크 이동하지 않는다. X(20px)를 빗맞히면
          삭제하려던 사용자가 질문/모임 상세로 튕겨나가기 때문. */}
      <button
        type="button"
        onClick={deleteMode ? undefined : onOpen}
        aria-disabled={deleteMode || undefined}
        className="flex w-full flex-col items-start gap-1.5 p-4 text-left"
      >
        <span className="flex min-w-0 max-w-full items-center gap-2">
          {entry.isAiAnswer !== null ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-body-medium-12",
                // primary-50/700 은 정의된 토큰이 아니라 배지가 배경 없이 렌더됐다. 정의된 primary 로 대체.
                entry.isAiAnswer ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
              )}
            >
              {entry.isAiAnswer
                ? messages.notification.aiAnswerSourceLabel
                : messages.notification.humanAnswerSourceLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-0 truncate text-body-medium-13",
              entry.isRead ? "text-gray-400" : "text-primary"
            )}
          >
            {entry.title}
          </span>
        </span>

        {entry.body ? (
          // 시안은 본문을 두 줄까지 그대로 흘려보낸다(말줄임 없음).
          <span className="w-full break-words text-body-medium-14 text-gray-900">{entry.body}</span>
        ) : null}

        {timeLabel ? (
          <span className="text-body-regular-12 text-gray-400">{timeLabel}</span>
        ) : null}
      </button>

      {deleteMode && (
        <button
          type="button"
          aria-label={messages.notification.deleteItemLabel}
          onClick={onDelete}
          className="absolute top-[15px] right-4 flex size-5 items-center justify-center rounded-full"
        >
          <Image src="/icons/app-bar/close.svg" alt="" width={20} height={20} className="size-5" />
        </button>
      )}
    </div>
  )
}

export { NotificationItem }
