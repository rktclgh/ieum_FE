"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createQuestionRoom } from "@/features/chat/api/chat-api"
import type { QuestionRoomRequest } from "@/features/chat/api/chat-types"
import { chatKeys } from "@/features/chat/hooks/use-chat-queries"
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
import { reportAnswer } from "@/features/report/api/report-api"
import type { ReportReason } from "@/features/report/api/report-types"
import {
  getSessionGeneration,
  isSessionGenerationCurrent,
} from "@/features/session/lib/session-cache"

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
      const sessionGeneration = getSessionGeneration(queryClient)
      await queryClient.cancelQueries({ queryKey: questionKeys.myList() })
      if (!isSessionGenerationCurrent(queryClient, sessionGeneration)) {
        return { previous: undefined, sessionGeneration }
      }
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
      return { previous, sessionGeneration }
    },
    onError: (_error, _questionId, context) => {
      if (!isSessionGenerationCurrent(queryClient, context?.sessionGeneration)) return
      if (context?.previous) {
        queryClient.setQueryData(questionKeys.myList(), context.previous)
      }
    },
    onSettled: (_data, _error, _questionId, context) => {
      if (!isSessionGenerationCurrent(queryClient, context?.sessionGeneration)) return
      queryClient.invalidateQueries({ queryKey: questionKeys.myList() })
    },
  })
}

// 답변 보기의 "채팅 시작" — 방 생성 성공 시 채팅 목록 캐시를 갱신한다.
function useCreateQuestionRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: QuestionRoomRequest) => createQuestionRoom(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() })
    },
  })
}

// 답변 신고 — 성공 시 호출부가 해당 답변을 로컬 블러 처리한다(BE에 신고상태 필드 없음).
function useReportAnswer() {
  return useMutation({
    mutationFn: ({
      answerId,
      reason,
      detail,
    }: {
      answerId: number
      reason: ReportReason
      detail?: string
    }) => reportAnswer(answerId, { reason, detail }),
  })
}

export {
  useCreateQuestion,
  useUpdateQuestion,
  usePostAnswer,
  useAcceptAnswer,
  useDeleteQuestion,
  useCreateQuestionRoom,
  useReportAnswer,
}
