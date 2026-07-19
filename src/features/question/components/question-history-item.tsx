"use client"

import * as React from "react"

import { NoImage } from "@/components/ui/no-image"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useQuestionDetail } from "@/features/question/hooks/use-question-queries"
import {
  deriveContentPreview,
  type MyQuestionListItemView,
} from "@/features/question/lib/question-adapter"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionHistoryItemProps {
  item: MyQuestionListItemView
  onOpen: () => void
  onLongPress: () => void
  /** 컨텍스트 메뉴가 열린 행 — 채팅 목록과 동일하게 부상시킨다(Figma 1722-13490). */
  active?: boolean
}

function QuestionHistoryItem({ item, onOpen, onLongPress, active }: QuestionHistoryItemProps) {
  const { messages } = useTranslation()
  const ref = React.useRef<HTMLButtonElement>(null)
  const longPress = useLongPress({ onLongPress })

  // N+1 완화: 뷰포트에 들어온 아이템만 상세를 지연 로드한다. 한 번 보이면 계속 유지(React Query 캐시).
  const [hasEntered, setHasEntered] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    // BE가 미리보기를 이미 주면 상세 로드가 불필요하므로 관찰 자체를 건너뛴다.
    if (!el || hasEntered || item.contentPreview) return
    // IntersectionObserver 미지원 환경(구형 브라우저·JSDOM 등)에선 즉시 로드로 우아하게 폴백.
    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = globalThis.setTimeout(() => setHasEntered(true), 0)
      return () => globalThis.clearTimeout(fallbackTimer)
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setHasEntered(true)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasEntered, item.contentPreview])

  // 상세 화면과 동일한 queryKey/queryFn 이라 React Query가 dedup → 상세 진입 시 재요청 없음.
  // 미리보기가 이미 있으면 상세 조회를 건너뛴다(BE 구현 후 N+1 방지).
  const detail = useQuestionDetail(item.questionId, hasEntered && !item.contentPreview)
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
      className={cn(
        "flex w-full items-center gap-3 py-3 text-left transition-all duration-200 ease-out",
        active
          ? "relative z-50 -translate-y-1 scale-[1.02] gap-2 rounded-2xl bg-white px-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]"
          : "translate-y-0 scale-100"
      )}
    >
      <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {item.thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailSrc}
            alt={messages.question.imageAlt}
            className="size-full object-cover"
          />
        ) : (
          <NoImage />
        )}
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
    </button>
  )
}

export { QuestionHistoryItem }
