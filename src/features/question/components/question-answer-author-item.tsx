"use client"

import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/features/chat/components/country-flag"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAnswerAuthorItemProps {
  answer: QuestionAnswerView
  isMine: boolean
  isReported: boolean
  canAccept: boolean
  onAccept: () => void
  onStartChat: () => void
  onReport: () => void
}

function QuestionAnswerAuthorItem({
  answer,
  isMine,
  isReported,
  canAccept,
  onAccept,
  onStartChat,
  onReport,
}: QuestionAnswerAuthorItemProps) {
  const { messages } = useTranslation()

  return (
    <div
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
          <span className="shrink-0 rounded-full bg-primary-400 px-2.5 py-1 text-body-medium-14 text-white">
            {messages.question.acceptedBadge}
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {canAccept ? (
              <Button variant="outline" size="sm" onClick={onAccept}>
                {messages.question.acceptButton}
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={onStartChat}>
              {messages.question.startChatLabel}
            </Button>
          </div>
        )}
      </div>

      {answer.content ? (
        <p
          className={
            isReported
              ? "text-body-regular-14 blur-sm select-none text-gray-700"
              : "whitespace-pre-line text-body-regular-14 text-gray-700"
          }
        >
          {answer.content}
        </p>
      ) : null}

      {!isMine && !isReported ? (
        <button
          type="button"
          onClick={onReport}
          className="self-end text-body-regular-13 text-gray-400"
        >
          {messages.question.reportAction}
        </button>
      ) : null}
    </div>
  )
}

export { QuestionAnswerAuthorItem }
