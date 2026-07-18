import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"

// 채택 버튼 표시 상태.
// - hidden: 버튼을 렌더하지 않는다.
// - acceptable: 누를 수 있다. 누르는 즉시 채택이 확정된다.
// - accepted: 채택된 답변에만 남는 "채택 완료" 표식. 누를 수 없다.
//
// 채택이 확정되면(BE가 재확정을 ANSWER_SELECTION_FINALIZED로 거부) 채택된 답변에만
// "채택 완료"가 남고, 채택되지 않은 답변에서는 버튼이 사라진다. Figma 1916-21884.
type AcceptButtonState = "acceptable" | "accepted" | "hidden"

interface ResolveAcceptButtonStateParams {
  answer: QuestionAnswerView
  isAuthor: boolean
  isAuthenticated: boolean
  hasAcceptedAnswer: boolean
  viewerUserId: number | null
}

/**
 * 답변 채택 버튼의 표시 상태를 결정한다.
 * 채택할 수 없는 경우는 버튼을 숨긴다 — AI답변, 비작성자, 본인이 쓴 답변
 * (BE SELF_ACCEPT_NOT_ALLOWED), 채택이 끝난 뒤의 미채택 답변.
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
  // 채택이 확정되면 채택된 답변에만 "채택 완료"가 남고 나머지는 버튼이 사라진다.
  if (hasAcceptedAnswer) return answer.isAccepted ? "accepted" : "hidden"
  if (answer.authorUserId != null && answer.authorUserId === viewerUserId) return "hidden"
  return "acceptable"
}

export { resolveAcceptButtonState }
export type { AcceptButtonState }
