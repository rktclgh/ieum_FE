"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  acceptAnswer,
  createQuestion,
  postAnswer,
  updateQuestion,
} from "@/features/question/api/question-api"
import { uploadImages } from "@/features/question/api/question-file-api"
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

// 파일 선택 → presign/S3/complete 업로드 → fileId 배열 반환.
function useUploadQuestionImages() {
  return useMutation({
    mutationFn: (files: File[]) => uploadImages(files),
  })
}

export {
  useCreateQuestion,
  useUpdateQuestion,
  usePostAnswer,
  useAcceptAnswer,
  useUploadQuestionImages,
}
