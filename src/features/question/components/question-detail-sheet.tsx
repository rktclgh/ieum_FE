"use client"

import * as React from "react"
import Image from "next/image"

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet"
import type { QuestionSummary } from "@/features/question/types"
import { useTranslation } from "@/lib/i18n/use-translation"

interface QuestionDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: QuestionSummary
  onSend?: (value: string) => void
}

function QuestionDetailSheet({ open, onOpenChange, question, onSend }: QuestionDetailSheetProps) {
  const { messages } = useTranslation()
  const [reply, setReply] = React.useState("")
  const hasImage = Boolean(question.imageUrl)

  const handleSend = () => {
    const value = reply.trim()
    if (!value) return
    onSend?.(value)
    setReply("")
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {hasImage ? (
        <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.imageUrl} alt={messages.question.imageAlt} className="size-full object-cover" />
          <BottomSheetClose
            aria-label={messages.question.closeLabel}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
          >
            <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
          </BottomSheetClose>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {question.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={question.authorAvatarUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-title-semibold-16 text-gray-900">{question.authorName}</span>
                {question.countryFlagSrc ? (
                  <span className="relative h-4 w-[22px] shrink-0 overflow-hidden rounded-[3px] border border-gray-100">
                    <Image src={question.countryFlagSrc} alt={messages.question.flagAlt} fill className="object-cover" />
                  </span>
                ) : null}
              </div>
              <span className="text-body-regular-14 text-gray-600">{question.timeLabel}</span>
            </div>
          </div>
          {!hasImage ? (
            <BottomSheetClose
              aria-label={messages.question.closeLabel}
              className="flex size-6 shrink-0 items-center justify-center self-start"
            >
              <Image src="/icons/app-bar/close.svg" alt="" width={24} height={24} className="size-6" />
            </BottomSheetClose>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-1">
          <h2 className="text-title-semibold-18 text-gray-900">{question.title}</h2>
          <p className="text-body-regular-14 whitespace-pre-line text-gray-600">{question.body}</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-2 rounded-full border border-gray-50 bg-gray-50/95 py-2 pr-2 pl-4">
        <input
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => {
            // 한글/일본어/중국어 IME 조합 중 Enter로 글자를 확정할 때는 전송하지 않는다.
            if (event.key === "Enter" && !event.nativeEvent.isComposing) handleSend()
          }}
          placeholder={messages.question.answerPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          aria-label={messages.question.sendLabel}
          onClick={handleSend}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-400"
        >
          <Image src="/icons/chat/send.svg" alt="" width={16} height={16} className="size-4" />
        </button>
      </div>
    </BottomSheet>
  )
}

export { QuestionDetailSheet }
