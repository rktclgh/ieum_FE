"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import type { ScheduleCardEntry } from "@/features/schedule/lib/schedule-adapter"

interface ScheduleListItemProps extends React.ComponentProps<"div"> {
  event: ScheduleCardEntry & {
    translatedTitle?: string
    translatedLocationLabel?: string
  }
  onSelect?: () => void
  onMoreClick?: () => void
  moreAriaLabel?: string
  /** 더보기 버튼 하단에 우측 정렬로 앵커할 메뉴 — 박스 전체가 아니라 버튼 기준으로 위치시키기 위해 버튼을 감싼 relative 래퍼 안에 렌더링한다. */
  menuSlot?: React.ReactNode
}

function ScheduleListItem({
  className,
  event,
  onSelect,
  onMoreClick,
  moreAriaLabel,
  menuSlot,
  ...props
}: ScheduleListItemProps) {
  // onSelect가 없으면 클릭 동작이 없어 button 대신 비대화형 div로 렌더링한다(시맨틱/a11y).
  const ContentWrapper = onSelect ? "button" : "div"

  return (
    <div
      data-slot="schedule-list-item"
      className={cn("flex w-full items-start gap-3 rounded-2xl bg-gray-50 p-3", className)}
      {...props}
    >
      <span className="flex h-[25px] shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-body-regular-12 whitespace-nowrap text-gray-900">
        {event.relativeLabel}
      </span>
      <ContentWrapper
        type={onSelect ? "button" : undefined}
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        <span className="w-full truncate text-title-semibold-16 text-gray-900">{event.translatedTitle ?? event.title}</span>
        <span className="flex items-center gap-1">
          <Image src="/icons/schedule/clock.svg" alt="" width={18} height={18} className="size-[18px]" />
          <span className="text-body-regular-14 text-gray-600">{event.timeLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <Image src="/icons/schedule/map-pin.svg" alt="" width={18} height={18} className="size-[18px]" />
          <span className="text-body-regular-14 text-gray-600">{event.translatedLocationLabel ?? event.locationLabel}</span>
        </span>
      </ContentWrapper>
      {onMoreClick && (
        <div className="relative -my-2 -mr-2 shrink-0">
          <button
            type="button"
            onClick={onMoreClick}
            aria-label={moreAriaLabel}
            className="flex size-11 items-center justify-center"
          >
            <Image src="/icons/schedule/more.svg" alt="" width={20} height={20} className="size-5" />
          </button>
          {menuSlot}
        </div>
      )}
    </div>
  )
}

export { ScheduleListItem }
