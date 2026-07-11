"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { getMyQuestions, getQuestion } from "@/features/question/api/question-api"
import { adaptQuestionDetail } from "@/features/question/lib/question-adapter"

const questionKeys = {
  all: ["questions"] as const,
  detail: (questionId: number) => [...questionKeys.all, "detail", questionId] as const,
  myList: () => [...questionKeys.all, "me"] as const,
}

function useQuestionDetail(questionId: number, enabled = true) {
  return useQuery({
    queryKey: questionKeys.detail(questionId),
    queryFn: () => getQuestion(questionId),
    enabled: enabled && Number.isFinite(questionId),
    select: adaptQuestionDetail,
  })
}

// 내 질문 목록 무한스크롤(커서 기반). nextCursor가 null이면 마지막 페이지.
function useMyQuestions(size = 20) {
  return useInfiniteQuery({
    queryKey: questionKeys.myList(),
    queryFn: ({ pageParam }) => getMyQuestions({ cursor: pageParam, size }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export { questionKeys, useQuestionDetail, useMyQuestions }
