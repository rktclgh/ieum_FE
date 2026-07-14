"use client"

import type { SimilarQuestion } from "@/features/question/api/question-types"

interface UseSimilarQuestionsResult {
  items: SimilarQuestion[]
}

/**
 * 작성 중인 질문과 비슷한, 이미 채택된 답변이 있는 질문을 제안한다.
 *
 * 백엔드 API(GET /api/v1/questions/similar?q=)가 아직 없어 지금은 항상 빈 목록을 돌려준다.
 * API가 생기면 이 훅만 교체(제목/내용 디바운스 → 요청 → 채택 답변만 필터)하면
 * CreateQuestionScreen·SimilarQuestionsSection 은 그대로 연결된다.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useSimilarQuestions(query: string): UseSimilarQuestionsResult {
  return { items: [] }
}

export { useSimilarQuestions }
