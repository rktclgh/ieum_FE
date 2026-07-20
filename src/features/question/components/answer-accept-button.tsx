import { useTranslation } from "@/lib/i18n/use-translation"

import type { AcceptButtonState } from "@/features/question/lib/answer-acceptance"

interface AnswerAcceptButtonProps {
  state: AcceptButtonState
  onClick: () => void
}

/**
 * 답변 채택 버튼 (Figma 1744-10029 / 1916-21884).
 * 누르는 즉시 채택이 확정되므로 사전 확인 단계가 없다. 확정 뒤에는 채택된 답변에만
 * 흰색 "채택 완료" 표식이 남고, 채택되지 않은 답변에서는 버튼이 사라진다.
 */
function AnswerAcceptButton({ state, onClick }: AnswerAcceptButtonProps) {
  const { messages } = useTranslation()

  if (state === "hidden") return null

  if (state === "accepted") {
    return (
      <span className="flex h-8 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white px-3 py-2 text-body-regular-13 text-gray-900">
        {messages.question.acceptedLabel}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-body-regular-13 text-white"
    >
      {messages.question.acceptAction}
    </button>
  )
}

export { AnswerAcceptButton }
