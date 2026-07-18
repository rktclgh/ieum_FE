import { useTranslation } from "@/lib/i18n/use-translation"

import type { AcceptButtonState } from "@/features/question/lib/answer-acceptance"

interface AnswerAcceptButtonProps {
  state: AcceptButtonState
  onClick: () => void
}

/**
 * 답변 채택 버튼 (Figma 1744-10029).
 * 채택할 수 없는 경우는 렌더하지 않는다 — 채택은 되돌릴 수 없어서 누를 수 없는 버튼을
 * 남길 이유가 없다. 누르는 즉시 확정되므로 사전 확인 단계도 없다.
 */
function AnswerAcceptButton({ state, onClick }: AnswerAcceptButtonProps) {
  const { messages } = useTranslation()

  if (state === "hidden") return null

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
