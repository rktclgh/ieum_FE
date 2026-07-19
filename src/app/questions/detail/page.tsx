"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { AnswerViewScreen } from "@/features/question/components/answer-view-screen"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function QuestionDetailRoute() {
  const searchParams = useSearchParams()
  const questionId = parsePositiveInteger(searchParams.get("questionId"))

  if (questionId === null) return <RoutePageState kind="invalid-link" />

  return <AnswerViewScreen key={questionId} questionId={questionId} />
}

export default function QuestionDetailPage() {
  return (
    <React.Suspense fallback={<RoutePageState kind="loading" />}>
      <QuestionDetailRoute />
    </React.Suspense>
  )
}
