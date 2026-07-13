"use client"

import Image from "next/image"

import type { SimilarQuestion } from "@/features/question/api/question-types"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface SimilarQuestionsSectionProps {
  items: SimilarQuestion[]
  /** 제안된 질문을 탭했을 때 (채택 답변 확인 등). 백엔드 연동 후 채움. */
  onSelect?: (question: SimilarQuestion) => void
  className?: string
}

/**
 * 작성 중 비슷한 질문 제안 섹션 (Figma 1716:9632).
 * 채택된 답변이 있는 질문만 items 로 넘어오며, 비어 있으면 아무것도 렌더링하지 않는다.
 * 데이터 바인딩은 useSimilarQuestions(현재 stub)이 담당하고 이 컴포넌트는 표시만 한다.
 */
function SimilarQuestionsSection({ items, onSelect, className }: SimilarQuestionsSectionProps) {
  const { messages } = useTranslation()

  if (items.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl bg-gray-50 py-3", className)}>
      <div className="flex items-center gap-1 px-4 py-1">
        <Image src="/icons/map/question.svg" alt="" width={20} height={20} className="size-5" />
        <span className="text-body-medium-14 text-gray-900">{messages.question.similarTitle}</span>
      </div>

      {items.map((item) => (
        <button
          key={item.questionId}
          type="button"
          onClick={() => onSelect?.(item)}
          className="flex items-center justify-between px-4 py-2 text-left"
        >
          <span className="truncate text-body-medium-16 text-gray-900">{item.title}</span>
          <Image
            src="/icons/arrow/right.svg"
            alt=""
            width={20}
            height={20}
            className="size-5 shrink-0"
          />
        </button>
      ))}
    </div>
  )
}

export { SimilarQuestionsSection }
