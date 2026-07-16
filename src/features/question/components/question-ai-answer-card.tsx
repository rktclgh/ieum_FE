"use client"

import { CircleCheck } from "lucide-react"

import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAiAnswerCardProps {
  answer: QuestionAnswerView
}

function QuestionAiAnswerCard({ answer }: QuestionAiAnswerCardProps) {
  const { messages } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 p-4">
      <div className="flex items-center gap-1.5">
        <CircleCheck className="size-5 text-primary" />
        <span className="text-title-semibold-16 text-gray-900">
          {messages.question.aiAnswerTitle}
        </span>
      </div>
      <p className="whitespace-pre-line text-body-regular-14 text-gray-700">
        {answer.content}
      </p>
    </div>
  )
}

export { QuestionAiAnswerCard }
