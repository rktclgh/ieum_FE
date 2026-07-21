"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import { NoImage } from "@/components/ui/no-image"
import type { MapPin } from "@/features/map/api/pin-types"
import { TranslateLongPress } from "@/features/translate/components/translate-long-press"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { resolveFileUrl } from "@/lib/api/file-url"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"

interface QuestionResultCardProps {
  pin: MapPin
  query?: string
  isAuthenticated?: boolean
  onClick: () => void
}

// 제목 + 본문(body)만 노출한다. "N분 전 · 국적" 메타 줄은 BE(#73)에 nationality/createdAt 이
// 생기기 전까지 데이터가 없어 생략한다. useQuestionSummary 는 상세 시트와 queryKey 를 공유한다.
// 모임 카드와 동일하게 롱프레스 번역 메뉴를 붙였다 — 질문 본문도 외국어로 올라오는 사용자 작성 글이라
// 검색 결과에서 번역이 필요한 건 같다(Figma 1951:27204 에는 모임 카드만 그려져 있다).
function QuestionResultCard({
  pin,
  query,
  isAuthenticated = false,
  onClick,
}: QuestionResultCardProps) {
  const { data: summary } = useQuestionSummary(pin.targetId)
  const thumbnail = resolveFileUrl(pin.thumbnailUrl)

  return (
    <TranslateLongPress
      title={pin.title}
      body={summary?.body ?? ""}
      isAuthenticated={isAuthenticated}
    >
      {({ active, title, body, longPress }) => (
        <button
          type="button"
          onClick={onClick}
          {...longPress}
          className={cn(
            "flex w-full items-center gap-3 py-2 text-left",
            LONG_PRESS_TRANSITION,
            active ? cn(LONG_PRESS_SURFACE_ACTIVE, "gap-2 px-3") : LONG_PRESS_INACTIVE
          )}
        >
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {thumbnail ? (
              <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <NoImage />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-body-semibold-15 text-gray-900">
              <HighlightedText text={title} query={query} />
            </p>
            {body ? <p className="truncate text-body-regular-13 text-gray-500">{body}</p> : null}
          </div>
        </button>
      )}
    </TranslateLongPress>
  )
}

export { QuestionResultCard }
