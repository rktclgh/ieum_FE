"use client"

import { CheckCircle2, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAiAnswerCardProps {
  answer: QuestionAnswerView
  isAuthenticated: boolean
}

function QuestionAiAnswerCard({ answer, isAuthenticated }: QuestionAiAnswerCardProps) {
  const { messages } = useTranslation()
  const translate = useTranslateToggle({
    text: answer.content,
    isAuthenticated,
  })

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl bg-gray-50 px-3 py-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-6 text-primary" />
        <span className="text-title-semibold-16 text-gray-900">
          {messages.question.aiAnswerTitle}
        </span>
      </div>
      <p className="whitespace-pre-line text-body-regular-14 text-gray-600">
        {translate.displayText}
      </p>
      {translate.canTranslate ? (
        <Button
          variant="ghost"
          size="xs"
          className="w-fit px-1.5 text-gray-400"
          disabled={translate.isLoading}
          onClick={translate.toggle}
        >
          <Globe className="size-3.5" />
          {translate.isLoading
            ? messages.translate.translatingLabel
            : translate.isShowingTranslation
              ? messages.translate.viewOriginalLabel
              : messages.translate.menuLabel}
        </Button>
      ) : null}
      {translate.isError ? (
        <span className="text-body-regular-12 text-red">{messages.translate.translateFailedLabel}</span>
      ) : null}
    </div>
  )
}

export { QuestionAiAnswerCard }
