"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { getMyQuestions, getQuestion } from "@/features/question/api/question-api"
import { adaptQuestionDetail, adaptQuestionSummary } from "@/features/question/lib/question-adapter"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

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
    meta: PUBLIC_QUERY_META,
    select: adaptQuestionDetail,
  })
}

// 지도 핀 상세 시트용 요약 뷰. detail 과 같은 queryKey 라 fetch 는 공유되고 select 만 다르다.
function useQuestionSummary(questionId: number, enabled = true) {
  return useQuery({
    queryKey: questionKeys.detail(questionId),
    queryFn: () => getQuestion(questionId),
    enabled: enabled && Number.isFinite(questionId),
    meta: PUBLIC_QUERY_META,
    select: adaptQuestionSummary,
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

export { questionKeys, useQuestionDetail, useQuestionSummary, useMyQuestions }
