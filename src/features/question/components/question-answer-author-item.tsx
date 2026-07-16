"use client"

import * as React from "react"
import { Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { shouldShowTranslateButton } from "@/features/translate/lib/translate-lang"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAnswerAuthorItemProps {
  answer: QuestionAnswerView
  isMine: boolean
  isReported: boolean
  // 채택 가능 여부. 질문이 이미 채택 확정(resolved)되면 false — 미채택 답변에 채택 버튼을 숨긴다.
  canAccept: boolean
  onAccept: () => void
  onStartChat: () => void
  onLongPress: (rect: DOMRect) => void
}

function QuestionAnswerAuthorItem({
  answer,
  isMine,
  isReported,
  canAccept,
  onAccept,
  onStartChat,
  onLongPress,
}: QuestionAnswerAuthorItemProps) {
  const { messages, language } = useTranslation()
  const ref = React.useRef<HTMLDivElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })

  // 원문 언어가 이미 현재 UI 언어와 같으면 번역이 무의미하므로 버튼을 숨긴다(이슈 #163).
  const canTranslate = shouldShowTranslateButton(answer.sourceLang, language)
  const translate = useTranslateToggle({ contentId: answer.answerId, sourceLang: answer.sourceLang })
  const displayContent =
    translate.isShowingTranslation && translate.translatedText ? translate.translatedText : answer.content

  return (
    <div
      ref={ref}
      {...(isMine ? {} : longPress)}
      className={
        isMine
          ? "flex w-full flex-col gap-2 rounded-2xl bg-white p-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.05)]"
          : "flex w-full flex-col gap-2 rounded-2xl bg-gray-50 p-4"
      }
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="size-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {answer.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={answer.authorAvatarUrl} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-title-semibold-16 text-gray-900">{answer.authorName}</span>
            {answer.countryFlagSrc && answer.nationalityCode ? (
              <CountryFlag
                flagSrc={answer.countryFlagSrc}
                country={messages.countries[answer.nationalityCode]}
              />
            ) : null}
          </div>
        </div>

        {isReported ? (
          <span className="shrink-0 text-body-medium-14 text-red">
            {messages.question.reportAction}
          </span>
        ) : isMine ? (
          <Button variant="primary" size="sm" onClick={onStartChat}>
            {messages.question.personalChatLabel}
          </Button>
        ) : answer.isAccepted ? (
          <Button variant="primary" size="sm" onClick={onStartChat}>
            {messages.question.startChatLabel}
          </Button>
        ) : canAccept ? (
          <Button variant="outline" size="sm" onClick={onAccept}>
            {messages.question.acceptButton}
          </Button>
        ) : null}
      </div>

      {answer.content ? (
        <p
          className={
            isReported
              ? "text-body-regular-14 blur-sm select-none text-gray-700"
              : "whitespace-pre-line text-body-regular-14 text-gray-700"
          }
        >
          {displayContent}
        </p>
      ) : null}

      {!isReported && answer.content && canTranslate ? (
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

export { QuestionAnswerAuthorItem }
