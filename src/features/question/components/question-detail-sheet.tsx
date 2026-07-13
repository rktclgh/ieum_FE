"use client"

import * as React from "react"
import Image from "next/image"

import { BottomSheet, BottomSheetClose } from "@/components/ui/bottom-sheet"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import type { QuestionSummary } from "@/features/question/types"
import { useTranslation } from "@/lib/i18n/use-translation"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface QuestionDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: QuestionSummary | null
  /**
   * 시트 하단 영역 종류.
   * - "answer": 답변 입력창(기본)
   * - "view-answers": 내가 쓴 질문 → "답변 보기" 버튼
   * - "answered": 내가 이미 답변한 질문 → "답변 완료" 비활성 버튼
   * - "pending": 내 정보 로딩 중 판별 보류 → 하단 영역 미노출
   */
  bottomVariant?: "answer" | "view-answers" | "answered" | "pending"
  /** 답변 전송. 사진을 첨부하면 imageFile 로 함께 넘어간다. */
  onSend?: (value: string, imageFile?: File | null) => void
  /** "답변 보기" 버튼 클릭(내가 쓴 질문일 때만 노출). */
  onViewAnswers?: () => void
  /** 첨부 이미지가 최대 크기를 초과했을 때(안내는 부모 토스트에서 처리). */
  onImageTooLarge?: () => void
}

function QuestionDetailSheet({
  open,
  onOpenChange,
  question,
  bottomVariant = "answer",
  onSend,
  onViewAnswers,
  onImageTooLarge,
}: QuestionDetailSheetProps) {
  const { messages } = useTranslation()
  const t = messages.question
  const [reply, setReply] = React.useState("")
  // 미리보기는 base64로 담아 object URL 수명관리(effect setState) 없이 렌더한다.
  const [image, setImage] = React.useState<{ preview: string; file: File } | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)

  // 닫힘 애니메이션 중 부모가 question을 null로 먼저 비워도 마지막 내용을 유지해 렌더링한다.
  // 렌더 중 상태 조정(React 권장 패턴) — question이 바뀌면 즉시 반영해 effect 없이 동기화한다.
  const [lastQuestion, setLastQuestion] = React.useState(question)
  if (question && question !== lastQuestion) setLastQuestion(question)
  const display = question ?? lastQuestion

  const handlePickImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // 같은 파일 재선택 허용
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      onImageTooLarge?.()
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage({ preview: reader.result as string, file })
    reader.readAsDataURL(file)
  }

  const handleSend = () => {
    const value = reply.trim()
    if (!value && !image) return
    onSend?.(value, image?.file ?? null)
    setReply("")
    setImage(null)
  }

  if (!display) return null
  const hasImage = Boolean(display.imageUrl)
  const timeLabel = formatRelativeTime(display.createdAt, t)
  const location = display.location

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {hasImage ? (
        <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={display.imageUrl} alt={t.imageAlt} className="size-full object-cover" />
          <BottomSheetClose
            aria-label={t.closeLabel}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
          >
            <Image src="/icons/circle/close-white.svg" alt="" width={16} height={16} className="size-4" />
          </BottomSheetClose>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {display.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={display.authorAvatarUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-title-semibold-16 text-gray-900">{display.authorName}</span>
                {display.countryFlagSrc ? (
                  <span className="relative h-4 w-[22px] shrink-0 overflow-hidden rounded-[3px] border border-gray-100">
                    <Image src={display.countryFlagSrc} alt={t.flagAlt} fill className="object-cover" />
                  </span>
                ) : null}
              </div>
              {timeLabel || location ? (
                <div className="flex min-w-0 items-center gap-1 text-body-regular-14 text-gray-600">
                  {timeLabel ? <span className="shrink-0">{timeLabel}</span> : null}
                  {timeLabel && location ? (
                    <span className="size-[3px] shrink-0 rounded-full bg-gray-400" />
                  ) : null}
                  {location ? <span className="truncate">{location}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
          {!hasImage ? (
            <BottomSheetClose
              aria-label={t.closeLabel}
              className="flex size-6 shrink-0 items-center justify-center self-start"
            >
              <Image src="/icons/app-bar/close.svg" alt="" width={24} height={24} className="size-6" />
            </BottomSheetClose>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-1">
          <h2 className="text-title-semibold-18 text-gray-900">{display.title}</h2>
          <p className="text-body-regular-14 whitespace-pre-line text-gray-600">{display.body}</p>
        </div>
      </div>

      {bottomVariant === "answer" ? (
      <>
      <div className="flex w-full items-center justify-between gap-2 rounded-full border border-gray-50 bg-gray-50/95 p-2 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            aria-label={t.addImageLabel}
            onClick={() => cameraInputRef.current?.click()}
            className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-400"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.preview} alt="" className="size-full object-cover" />
            ) : (
              <Image src="/icons/chat/camera-fill.svg" alt="" width={20} height={20} className="size-5" />
            )}
          </button>
          <input
            aria-label={t.answerPlaceholder}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              // 한글/일본어/중국어 IME 조합 중 Enter로 글자를 확정할 때는 전송하지 않는다.
              if (event.key === "Enter" && !event.nativeEvent.isComposing) handleSend()
            }}
            placeholder={t.answerPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          type="button"
          aria-label={t.sendLabel}
          onClick={handleSend}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-400"
        >
          <Image src="/icons/chat/send.svg" alt="" width={16} height={16} className="size-4" />
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickImage}
        className="hidden"
      />
      </>
      ) : bottomVariant === "view-answers" ? (
        <button
          type="button"
          onClick={onViewAnswers}
          className="flex w-full items-center justify-center rounded-full bg-primary-600 px-4 py-3 text-body-medium-14 text-white"
        >
          {t.viewAnswersLabel}
        </button>
      ) : bottomVariant === "answered" ? (
        <div className="flex w-full items-center justify-center rounded-full bg-gray-200 px-4 py-3 text-body-medium-14 text-white">
          {t.answeredLabel}
        </div>
      ) : null}
    </BottomSheet>
  )
}

export { QuestionDetailSheet }
