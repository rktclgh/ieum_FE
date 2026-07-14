"use client"

import { ChevronRight } from "lucide-react"

import { useLongPress } from "@/features/chat/hooks/use-long-press"
import type { MyQuestionListItemView } from "@/features/question/lib/question-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionHistoryItemProps {
  item: MyQuestionListItemView
  onOpen: () => void
  onLongPress: () => void
}

function QuestionHistoryItem({ item, onOpen, onLongPress }: QuestionHistoryItemProps) {
  const { messages } = useTranslation()
  const longPress = useLongPress({ onLongPress })
  const timeLabel = formatRelativeTime(item.createdAt, messages.question)

  return (
    <button
      type="button"
      onClick={onOpen}
      {...longPress}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0px_2px_12px_0px_rgba(0,0,0,0.05)]"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {item.thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailSrc} alt={messages.question.imageAlt} className="size-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-title-semibold-16 text-gray-900">{item.title}</span>
        {item.contentPreview ? (
          <span className="truncate text-body-regular-14 text-gray-500">
            {item.contentPreview}
          </span>
        ) : null}
        {timeLabel ? <span className="text-body-regular-13 text-gray-400">{timeLabel}</span> : null}
      </div>
      <ChevronRight className="size-5 shrink-0 text-gray-300" />
    </button>
  )
}

export { QuestionHistoryItem }
