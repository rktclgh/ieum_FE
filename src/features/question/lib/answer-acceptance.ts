import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"

// 채택 버튼 표시 상태.
// - hidden: 버튼 자체를 렌더하지 않는다(AI답변·비작성자).
// - disabled: 자리는 지키되 누를 수 없다(본인 답변·이미 채택 확정). Figma 1916-21884.
// - acceptable: 누를 수 있다.
type AcceptButtonState = "acceptable" | "disabled" | "hidden"

interface ResolveAcceptButtonStateParams {
  answer: QuestionAnswerView
  isAuthor: boolean
  isAuthenticated: boolean
  hasAcceptedAnswer: boolean
  viewerUserId: number | null
}

/**
 * 답변 채택 버튼의 표시 상태를 결정한다.
 * disabled 두 케이스는 BE가 각각 SELF_ACCEPT_NOT_ALLOWED / ANSWER_SELECTION_FINALIZED로
 * 거부하는 요청이라, FE에서 미리 막아 헛된 왕복을 없앤다.
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
  if (answer.authorUserId != null && answer.authorUserId === viewerUserId) return "disabled"
  if (hasAcceptedAnswer) return "disabled"
  return "acceptable"
}

export { resolveAcceptButtonState }
export type { AcceptButtonState }
