"use client"

import { Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { shouldShowTranslateButton } from "@/features/translate/lib/translate-lang"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAnswerItemProps {
  answer: QuestionAnswerView
  canAccept: boolean
  onAccept: () => void
}

function QuestionAnswerItem({ answer, canAccept, onAccept }: QuestionAnswerItemProps) {
  const { messages, language } = useTranslation()

  // 원문 언어가 이미 현재 UI 언어와 같으면 번역이 무의미하므로 버튼을 숨긴다(이슈 #163).
  const canTranslate = shouldShowTranslateButton(answer.sourceLang, language)
  const translate = useTranslateToggle({ contentId: answer.answerId, sourceLang: answer.sourceLang })
  const displayContent =
    translate.isShowingTranslation && translate.translatedText ? translate.translatedText : answer.content

  return (
    <div className="flex w-full flex-col gap-2 border-b border-gray-50 py-3">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {answer.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={answer.authorAvatarUrl} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <span className="text-title-semibold-16 text-gray-900">{answer.authorName}</span>
          {answer.isAi ? (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-body-medium-14 text-primary-400">
              {messages.question.aiBadge}
            </span>
          ) : null}
          {answer.isAccepted ? (
            <span className="rounded-full bg-primary-400 px-2 py-0.5 text-body-medium-14 text-white">
              {messages.question.acceptedBadge}
            </span>
          ) : null}
        </div>
        {canAccept ? (
          <Button variant="primary" size="sm" onClick={onAccept}>
            {messages.question.acceptButton}
          </Button>
        ) : null}
      </div>

      {answer.content ? (
        <p className="text-body-regular-14 whitespace-pre-line text-gray-700">{displayContent}</p>
      ) : null}

      {answer.content && canTranslate ? (
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

      {answer.imageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {answer.imageUrls.map((url) => (
            <div key={url} className="relative size-24 overflow-hidden rounded-xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={messages.question.imageAlt} className="size-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { QuestionAnswerItem }
