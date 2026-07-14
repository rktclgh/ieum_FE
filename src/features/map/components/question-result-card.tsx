"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import type { MapPin } from "@/features/map/api/pin-types"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { resolveFileUrl } from "@/lib/api/file-url"

interface QuestionResultCardProps {
  pin: MapPin
  query?: string
  onClick: () => void
}

// 제목 + 본문(body)만 노출한다. "N분 전 · 국적" 메타 줄은 BE(#73)에 nationality/createdAt 이
// 생기기 전까지 데이터가 없어 생략한다. useQuestionSummary 는 상세 시트와 queryKey 를 공유한다.
function QuestionResultCard({ pin, query, onClick }: QuestionResultCardProps) {
  const { data: summary } = useQuestionSummary(pin.targetId)
  const thumbnail = resolveFileUrl(pin.thumbnailUrl)

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2 text-left">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {thumbnail ? <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={pin.title} query={query} />
        </p>
        {summary?.body ? (
          <p className="truncate text-body-regular-13 text-gray-500">{summary.body}</p>
        ) : null}
      </div>
    </button>
  )
}

export { QuestionResultCard }
