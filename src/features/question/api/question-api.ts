import { apiClient } from "@/lib/api/client"

import type {
  CreateQuestionRequest,
  MyQuestionsPage,
  PostAnswerRequest,
  PostAnswerResponse,
  QuestionDetailResponse,
  UpdateQuestionRequest,
} from "@/features/question/api/question-types"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getQuestion(questionId: number) {
  const { data } = await apiClient.get<QuestionDetailResponse>(
    `/api/v1/questions/${questionId}`
  )
  return data
}

// 내 질문 목록 — 커서 페이지네이션(size 기본 20).
async function getMyQuestions(params: { cursor?: string | null; size?: number }) {
  const { data } = await apiClient.get<MyQuestionsPage>("/api/v1/questions/me", {
    params: {
      cursor: params.cursor ?? undefined,
      size: params.size ?? 20,
    },
  })
  return data
}

// 상태 변경 (CSRF 필요).

async function createQuestion(body: CreateQuestionRequest) {
  const { data } = await apiClient.post<QuestionDetailResponse>(
    "/api/v1/questions",
    body
  )
  return data
}

async function updateQuestion(questionId: number, body: UpdateQuestionRequest) {
  const { data } = await apiClient.patch<QuestionDetailResponse>(
    `/api/v1/questions/${questionId}`,
    body
  )
  return data
}

// 답변 작성 — content / imageFileIds 중 하나는 필수(백엔드 검증). 201 { answerId }.
async function postAnswer(questionId: number, body: PostAnswerRequest) {
  const { data } = await apiClient.post<PostAnswerResponse>(
    `/api/v1/questions/${questionId}/answer`,
    body
  )
  return data
}

// 답변 채택 — 204. 질문 작성자만 가능, 본인 답변 채택 불가(SELF_ACCEPT_NOT_ALLOWED).
async function acceptAnswer(answerId: number) {
  await apiClient.post(`/api/v1/answers/${answerId}/accept`)
}

export {
  getQuestion,
  getMyQuestions,
  createQuestion,
  updateQuestion,
  postAnswer,
  acceptAnswer,
}
