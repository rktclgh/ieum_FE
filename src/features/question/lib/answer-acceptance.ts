import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"

// 채택 버튼 표시 상태.
// - hidden: 버튼을 렌더하지 않는다.
// - acceptable: 누를 수 있다. 누르는 즉시 채택이 확정된다.
//
// 채택은 되돌릴 수 없어서(BE가 재확정을 ANSWER_SELECTION_FINALIZED로 거부) "누를 수 없는
// 버튼"을 남길 이유가 없다. 채택이 끝나면 모든 답변에서 버튼이 사라진다.
type AcceptButtonState = "acceptable" | "hidden"

interface ResolveAcceptButtonStateParams {
  answer: QuestionAnswerView
  isAuthor: boolean
  isAuthenticated: boolean
  hasAcceptedAnswer: boolean
  viewerUserId: number | null
}

/**
 * 답변 채택 버튼의 표시 상태를 결정한다.
 * 채택할 수 없는 경우는 전부 버튼을 숨긴다 — AI답변, 비작성자, 본인이 쓴 답변
 * (BE SELF_ACCEPT_NOT_ALLOWED), 이미 채택이 끝난 질문(BE ANSWER_SELECTION_FINALIZED).
 */
function resolveAcceptButtonState({
  answer,
  isAuthor,
  isAuthenticated,
  hasAcceptedAnswer,
  viewerUserId,
}: ResolveAcceptButtonStateParams): AcceptButtonState {
  if (answer.isAi) return "hidden"
  if (!isAuthor || !isAuthenticated) return "hidden"
  // 채택이 확정되면 채택된 답변을 포함해 모든 버튼이 사라진다.
  if (hasAcceptedAnswer) return "hidden"
  if (answer.authorUserId != null && answer.authorUserId === viewerUserId) return "hidden"
  return "acceptable"
}

export { resolveAcceptButtonState }
export type { AcceptButtonState }
