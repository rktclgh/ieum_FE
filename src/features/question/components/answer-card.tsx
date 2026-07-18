"use client"

import * as React from "react"

import { NoImageProfile } from "@/components/ui/no-image"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { AnswerAcceptButton } from "@/features/question/components/answer-accept-button"
import type { AcceptButtonState } from "@/features/question/lib/answer-acceptance"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"

interface AnswerCardProps {
  answer: QuestionAnswerView
  acceptState: AcceptButtonState
  onAccept: () => void
  onLongPress: (rect: DOMRect) => void
}

/** 사람이 쓴 답변 카드 (Figma 1744-10029). 롱프레스로 번역·신고 액션을 연다. */
function AnswerCard({ answer, acceptState, onAccept, onLongPress }: AnswerCardProps) {
  const { messages } = useTranslation()
  const ref = React.useRef<HTMLDivElement>(null)
  const longPress = useLongPress({
    onLongPress: () => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) onLongPress(rect)
    },
  })

  const countryName = answer.nationalityCode
    ? messages.countries[answer.nationalityCode]
    : undefined

  return (
    <div
      ref={ref}
      {...longPress}
      className="flex w-full flex-col gap-3 rounded-xl bg-gray-50 px-3 py-4"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {answer.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={answer.authorAvatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <NoImageProfile />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-title-semibold-16 text-gray-900">
              {answer.authorName}
            </span>
            {answer.countryFlagSrc && countryName ? (
              <CountryFlag flagSrc={answer.countryFlagSrc} country={countryName} />
            ) : null}
          </div>
        </div>
        <AnswerAcceptButton state={acceptState} onClick={onAccept} />
      </div>
      <p className="text-body-regular-14 whitespace-pre-line text-gray-600">{answer.content}</p>
    </div>
  )
}

export { AnswerCard }
