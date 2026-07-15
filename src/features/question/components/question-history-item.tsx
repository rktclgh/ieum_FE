"use client"

import * as React from "react"

import { ChevronRight } from "lucide-react"

import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import {
  deriveContentPreview,
  type MyQuestionListItemView,
} from "@/features/question/lib/question-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionHistoryItemProps {
  item: MyQuestionListItemView
  onOpen: () => void
  onLongPress: (rect: DOMRect) => void
}

function QuestionHistoryItem({ item, onOpen, onLongPress }: QuestionHistoryItemProps) {
  const { messages } = useTranslation()
  const ref = React.useRef<HTMLButtonElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })

  // N+1 완화: 뷰포트에 들어온 아이템만 상세를 지연 로드한다. 한 번 보이면 계속 유지(React Query 캐시).
  const [hasEntered, setHasEntered] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || hasEntered) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setHasEntered(true)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasEntered])

  // 상세 화면과 동일한 queryKey/queryFn 이라 React Query가 dedup → 상세 진입 시 재요청 없음.
  const detail = useQuestionDetail(item.questionId, hasEntered)
  // BE가 미리보기를 주면 우선, 아니면 상세 content 로 FE 파생값을 만든다.
  const contentPreview = item.contentPreview ?? deriveContentPreview(detail.data?.content)
  const isPreviewLoading = hasEntered && detail.isLoading && !item.contentPreview

  const timeLabel = formatRelativeTime(item.createdAt, messages.question)

  return (
    <button
      ref={ref}
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
        {contentPreview ? (
          <span className="truncate text-body-regular-14 text-gray-500">{contentPreview}</span>
        ) : isPreviewLoading ? (
          <span className="h-4 w-3/4 animate-pulse rounded bg-gray-100" aria-hidden />
        ) : null}
        {timeLabel ? <span className="text-body-regular-13 text-gray-400">{timeLabel}</span> : null}
      </div>
      <ChevronRight className="size-5 shrink-0 text-gray-300" />
    </button>
  )
}

export { QuestionHistoryItem }
