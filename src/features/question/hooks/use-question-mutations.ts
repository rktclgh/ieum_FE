"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  acceptAnswer,
  createQuestion,
  postAnswer,
  updateQuestion,
} from "@/features/question/api/question-api"
import type {
  CreateQuestionRequest,
  PostAnswerRequest,
  UpdateQuestionRequest,
} from "@/features/question/api/question-types"
import { questionKeys } from "@/features/question/hooks/use-question-queries"

function useCreateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateQuestionRequest) => createQuestion(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
      // 새 질문 핀이 지도에 바로 뜨도록 지도 핀 쿼리도 무효화한다(모임 생성과 동일).
      queryClient.invalidateQueries({ queryKey: ["pins"] })
    },
  })
}

function useUpdateQuestion(questionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateQuestionRequest) => updateQuestion(questionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) })
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
    },
  })
}

function usePostAnswer(questionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PostAnswerRequest) => postAnswer(questionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) })
    },
  })
}

// 답변 채택 성공 시 질문이 resolved 상태가 되므로 상세를 갱신한다.
function useAcceptAnswer(questionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (answerId: number) => acceptAnswer(answerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) })
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
    },
  })
}

export {
  useCreateQuestion,
  useUpdateQuestion,
  usePostAnswer,
  useAcceptAnswer,
}
