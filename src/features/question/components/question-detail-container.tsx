"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { QuestionDetailSheet } from "@/features/question/components/question-detail-sheet"
import { usePostAnswer } from "@/features/question/hooks/use-question-mutations"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { getQuestionErrorMessage } from "@/features/question/lib/question-error"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionDetailContainerProps {
  questionId: number
  /** 시트를 닫을 때 호출. 없으면 라우트 뒤로가기(router.back). 지도 핀 오버레이에선 콜백으로 닫는다. */
  onClose?: () => void
}

/**
 * 질문 상세 바텀시트 컨테이너. 요약 조회 + 답변 작성 mutation 을 시트에 연결한다.
 * 지도 질문 핀 클릭 시 오버레이로 열린다(모임 상세 컨테이너와 동일한 패턴).
 */
function QuestionDetailContainer({ questionId, onClose }: QuestionDetailContainerProps) {
  const router = useRouter()
  const { messages } = useTranslation()

  const summaryQuery = useQuestionSummary(questionId)
  const postAnswer = usePostAnswer(questionId)

  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const close = () => (onClose ? onClose() : router.back())

  const handleSend = (value: string) => {
    if (postAnswer.isPending) return
    postAnswer.mutate(
      { content: value },
      { onError: (error) => setActionError(getQuestionErrorMessage(error, messages)) }
    )
  }

  return (
    <>
      <QuestionDetailSheet
        open
        onOpenChange={(next) => {
          if (!next) close()
        }}
        question={summaryQuery.data ?? null}
        onSend={handleSend}
      />

      {actionError && (
        <div className="fixed inset-x-0 bottom-24 z-[60] mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}
    </>
  )
}

export { QuestionDetailContainer }
