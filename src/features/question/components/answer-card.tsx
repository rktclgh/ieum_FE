"use client"

import * as React from "react"

import { NoImageProfile } from "@/components/ui/no-image"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { AnswerAcceptButton } from "@/features/question/components/answer-accept-button"
import type { AcceptButtonState } from "@/features/question/lib/answer-acceptance"
import type { QuestionAnswerView } from "@/features/question/lib/question-adapter"
import { useLongPress } from "@/lib/hooks/use-long-press"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface AnswerCardProps {
  answer: QuestionAnswerView
  acceptState: AcceptButtonState
  onAccept: () => void
  onLongPress: () => void
  /** 컨텍스트 메뉴가 열린 카드 — 채팅 목록과 동일하게 제자리에서 부상시킨다. */
  active?: boolean
  /**
   * 주어지면 카드 전체가 탭 가능해진다. 채택된 답변에서 꼬리질문 채팅방으로 다시 들어가는
   * 경로로 쓴다(채택 완료 다이얼로그를 닫은 뒤에도 재진입할 수 있도록).
   */
  onOpenChat?: () => void
}

/** 사람이 쓴 답변 카드 (Figma 1744-10029). 롱프레스로 번역·신고 액션을 연다. */
function AnswerCard({
  answer,
  acceptState,
  onAccept,
  onLongPress,
  active,
  onOpenChat,
}: AnswerCardProps) {
  const { messages } = useTranslation()
  const longPress = useLongPress({ onLongPress })

  const countryName = answer.nationalityCode
    ? messages.countries[answer.nationalityCode]
    : undefined

  return (
    <div
      {...longPress}
      {...(onOpenChat
        ? {
            role: "button" as const,
            tabIndex: 0,
            "aria-label": messages.question.openChatWithAuthor(answer.authorName),
            onClick: onOpenChat,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onOpenChat()
              }
            },
          }
        : {})}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl px-3 py-4",
        LONG_PRESS_TRANSITION,
        onOpenChat && "cursor-pointer",
        active ? LONG_PRESS_SURFACE_ACTIVE : cn(LONG_PRESS_INACTIVE, "bg-gray-50")
      )}
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
          <div className="flex min-w-0 flex-col items-start gap-0.5">
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
