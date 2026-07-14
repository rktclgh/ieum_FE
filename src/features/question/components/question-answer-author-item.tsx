"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionAnswerAuthorItemProps {
  answer: QuestionAnswerView
  isMine: boolean
  isReported: boolean
  onAccept: () => void
  onStartChat: () => void
  onLongPress: (rect: DOMRect) => void
}

function QuestionAnswerAuthorItem({
  answer,
  isMine,
  isReported,
  onAccept,
  onStartChat,
  onLongPress,
}: QuestionAnswerAuthorItemProps) {
  const { messages } = useTranslation()
  const ref = React.useRef<HTMLDivElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })

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
        ) : (
          <Button variant="outline" size="sm" onClick={onAccept}>
            {messages.question.acceptButton}
          </Button>
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
    </div>
  )
}

export { QuestionAnswerAuthorItem }
