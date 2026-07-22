"use client"

import * as React from "react"
import Image from "next/image"
import { Download } from "lucide-react"

import { BottomSheetClose } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { NoImageProfile } from "@/components/ui/no-image"
import { MessageTextarea } from "@/components/ui/text-field/message-textarea"
import { Toast } from "@/components/ui/toast"
import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import { formatRelativeTime } from "@/features/question/lib/question-time"
import type { QuestionSummary } from "@/features/question/types"
import { TranslateLongPress } from "@/features/translate/components/translate-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useSaveImage } from "@/lib/hooks/use-save-image"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/**
 * 시트 하단 영역 종류.
 * - "answer": 답변 입력창(기본)
 * - "view-answers": 내가 쓴 질문 → "답변 보기" 버튼
 * - "answered": 내가 이미 답변한 질문 → "답변 완료" 비활성 버튼
 * - "pending": 내 정보 로딩 중 판별 보류 → 하단 영역 미노출
 */
type QuestionBottomVariant = "answer" | "view-answers" | "answered" | "pending"

interface QuestionDetailCardProps {
  question: QuestionSummary
  bottomVariant?: QuestionBottomVariant
  /** 답변 전송. 사진을 첨부하면 imageFile 로 함께 넘어간다. */
  onSend?: (value: string, imageFile?: File | null) => void
  /** "답변 보기" 버튼 클릭(내가 쓴 질문일 때만 노출). */
  onViewAnswers?: () => void
  /** 첨부 이미지가 최대 크기를 초과했을 때(안내는 부모 토스트에서 처리). */
  onImageTooLarge?: () => void
  /**
   * 이 카드가 화면에 노출 중인지. false면 롱프레스 메뉴를 닫는다.
   * 시트는 닫힘 여부를, 캐러셀은 활성 슬라이드 여부를 넘긴다 — 메뉴의 dim 오버레이가
   * 안 보이는 카드에 남아 화면을 덮는 것을 막는다.
   */
  active?: boolean
  /** 번역 메뉴 노출 조건. 비로그인이면 롱프레스가 무반응이다. */
  isAuthenticated?: boolean
}

/**
 * 질문 상세 카드 본문(프레젠테이셔널).
 *
 * BottomSheet 루트를 갖지 않아, 단일 시트(QuestionDetailSheet)와 겹친 핀 캐러셀(PinStackSheet)
 * 양쪽에서 같은 본문을 재사용한다. 답변 입력값·첨부 이미지는 카드마다 독립이므로 여기서 소유한다.
 */
function QuestionDetailCard({
  question,
  bottomVariant = "answer",
  onSend,
  onViewAnswers,
  onImageTooLarge,
  active = true,
  isAuthenticated = false,
}: QuestionDetailCardProps) {
  const { messages } = useTranslation()
  const t = messages.question
  const [reply, setReply] = React.useState("")
  // 미리보기는 base64로 담아 object URL 수명관리(effect setState) 없이 렌더한다.
  const [image, setImage] = React.useState<{ preview: string; file: File } | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false)
  const saveImageAction = useSaveImage()
  const imageLongPress = useLongPress({ onLongPress: () => setImageMenuOpen(true) })

  // 렌더 중 상태 조정(React 권장 패턴) — 카드가 가려지면 effect 없이 즉시 메뉴를 닫는다.
  if (!active && imageMenuOpen) setImageMenuOpen(false)

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

  const imageUrl = question.imageUrl
  const hasImage = Boolean(imageUrl)
  const timeLabel = formatRelativeTime(question.createdAt, t)
  const location = question.location

  return (
    <>
      {hasImage ? (
        // 메뉴가 top-full 로 앵커되므로 클리핑(overflow-hidden)은 안쪽 컨테이너에만 남긴다.
        <div
          className={cn(
            "relative w-full",
            LONG_PRESS_TRANSITION,
            imageMenuOpen ? LONG_PRESS_LIFT_ACTIVE : LONG_PRESS_INACTIVE
          )}
          {...imageLongPress}
        >
          <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={t.imageAlt} className="size-full object-cover" />
            <BottomSheetClose
              aria-label={t.closeLabel}
              className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-black/50"
            >
              <Icon name="circle/close-white" width={16} height={16} className="size-4" />
            </BottomSheetClose>
          </div>
          {imageMenuOpen && imageUrl ? (
            <ChatContextMenu
              items={[
                {
                  icon: <Download className="size-6 text-gray-900" />,
                  label: messages.common.saveImage,
                  onClick: () => {
                    setImageMenuOpen(false)
                    void saveImageAction.save(imageUrl)
                  },
                },
              ]}
              dimmed
              onDismiss={() => setImageMenuOpen(false)}
              className="top-full left-1/2 mt-3 -translate-x-1/2"
            />
          ) : null}
        </div>
      ) : null}

      {/* 본문 롱프레스 → 번역 메뉴(#463). 이미지·닫기·하단 액션은 제외한다. */}
      <TranslateLongPress
        title={question.title}
        body={question.body}
        isAuthenticated={isAuthenticated}
        anchor="surface"
        visible={active}
      >
        {({ title, body, longPress }) => (
          <div className="flex w-full flex-col gap-3" {...longPress}>
            <div className="flex w-full items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  {question.authorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={question.authorAvatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <NoImageProfile />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-title-semibold-16 text-gray-900">{question.authorName}</span>
                    {question.countryFlagSrc ? (
                      <span className="relative h-4 w-[22px] shrink-0 overflow-hidden rounded-[3px] border border-gray-100">
                        <Image src={question.countryFlagSrc} alt={t.flagAlt} fill className="object-cover" />
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
                  // 닫기 버튼은 롱프레스 대상에서 제외한다 — 여기서 전파를 끊지 않으면 버튼을
                  // 길게 눌러도 본문 번역 메뉴가 열린다.
                  onPointerDown={(event) => event.stopPropagation()}
                  className="flex size-6 shrink-0 items-center justify-center self-start"
                >
                  <Icon name="app-bar/close" width={24} height={24} className="size-6" />
                </BottomSheetClose>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-1">
              <h2 className="text-title-semibold-18 text-gray-900">{title}</h2>
              <p className="text-body-regular-14 whitespace-pre-line text-gray-600">{body}</p>
            </div>
          </div>
        )}
      </TranslateLongPress>

      {bottomVariant === "answer" ? (
        <>
          <div className="flex w-full items-end justify-between gap-2 rounded-3xl border border-gray-50 bg-gray-50/95 p-2 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]">
            <div className="flex min-w-0 flex-1 items-end gap-2">
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
                  <Icon name="chat/camera-fill" width={20} height={20} className="size-5" />
                )}
              </button>
              <MessageTextarea
                aria-label={t.answerPlaceholder}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                onSubmit={handleSend}
                placeholder={t.answerPlaceholder}
                className="py-1.5"
              />
            </div>
            <button type="button" aria-label={t.sendLabel} onClick={handleSend} className="size-8 shrink-0">
              <Icon name="chat/send-button" width={32} height={32} className="size-8" />
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
        <Button variant="accent" size="block" onClick={onViewAnswers}>
          {t.viewAnswersLabel}
        </Button>
      ) : bottomVariant === "answered" ? (
        // 답변 완료 = Gray/200 채움 + 흰 글씨. accent variant의 disabled가 그대로 그 값이다.
        <Button variant="accent" size="block" disabled>
          {t.answeredLabel}
        </Button>
      ) : null}

      <Toast open={saveImageAction.failed} message={messages.common.saveImageFailed} />
    </>
  )
}

export { QuestionDetailCard }
export type { QuestionBottomVariant }
