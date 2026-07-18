"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import { NoImage } from "@/components/ui/no-image"
import type { MapPin } from "@/features/map/api/pin-types"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import { adaptMeetingDetail } from "@/features/meetup/lib/meetup-adapter"
import { resolveFileUrl } from "@/lib/api/file-url"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupResultCardProps {
  pin: MapPin
  query?: string
  onClick: () => void
}

// 핀(title/thumbnail)만으로 즉시 렌더하고, 참여인원·설명·일시는 상세 fetch로 채운다.
// useMeeting 은 지도 핀 탭과 queryKey 를 공유하므로 캐시 히트가 잦다. 실패해도 제목·썸네일은 유지된다.
function MeetupResultCard({ pin, query, onClick }: MeetupResultCardProps) {
  const { messages, language } = useTranslation()
  const { data } = useMeeting(pin.targetId)
  const detail = data ? adaptMeetingDetail(data, language) : null
  const thumbnail = resolveFileUrl(pin.thumbnailUrl)

  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2 text-left">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {thumbnail ? <Image src={thumbnail} alt="" fill sizes="64px" className="object-cover" /> : <NoImage />}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={pin.title} query={query} />
        </p>
        {detail?.description ? (
          <p className="truncate text-body-regular-13 text-gray-500">{detail.description}</p>
        ) : null}
        {detail ? (
          <p className="truncate text-body-regular-12 text-gray-400">
            {detail.dateLabel ? `${detail.dateLabel} · ` : ""}
            {messages.home.listParticipantCount(detail.participantCount)}
          </p>
        ) : null}
      </div>
    </button>
  )
}

export { MeetupResultCard }
