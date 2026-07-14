"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  acceptAnswer,
  createQuestion,
  deleteQuestion,
  postAnswer,
  updateQuestion,
} from "@/features/question/api/question-api"
import type {
  CreateQuestionRequest,
  MyQuestionsPage,
  PostAnswerRequest,
  UpdateQuestionRequest,
} from "@/features/question/api/question-types"
import type { InfiniteData } from "@tanstack/react-query"
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

// 질문 삭제 — 무한쿼리 캐시에서 낙관적으로 제거하고 실패 시 롤백한다.
function useDeleteQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionId: number) => deleteQuestion(questionId),
    onMutate: async (questionId) => {
      await queryClient.cancelQueries({ queryKey: questionKeys.myList() })
      const previous = queryClient.getQueryData<InfiniteData<MyQuestionsPage>>(
        questionKeys.myList()
      )
      queryClient.setQueryData<InfiniteData<MyQuestionsPage>>(
        questionKeys.myList(),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((item) => item.questionId !== questionId),
                })),
              }
            : data
      )
      return { previous }
    },
    onError: (_error, _questionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(questionKeys.myList(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
    },
  })
}

export {
  useCreateQuestion,
  useUpdateQuestion,
  usePostAnswer,
  useAcceptAnswer,
  useDeleteQuestion,
}
