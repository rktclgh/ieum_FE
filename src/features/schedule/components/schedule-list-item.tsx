"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import type { ScheduleEntry } from "@/features/schedule/lib/schedule-adapter"

interface ScheduleListItemProps extends React.ComponentProps<"div"> {
  event: ScheduleEntry
  onSelect?: () => void
  onMoreClick?: () => void
}

function ScheduleListItem({ className, event, onSelect, onMoreClick, ...props }: ScheduleListItemProps) {
  return (
    <div
      data-slot="schedule-list-item"
      className={cn("flex w-full items-start gap-3 rounded-2xl bg-gray-50 p-3", className)}
      {...props}
    >
      <span className="flex h-[25px] shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-body-regular-12 whitespace-nowrap text-gray-900">
        {event.relativeLabel}
      </span>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        <span className="w-full truncate text-title-semibold-16 text-gray-900">{event.title}</span>
        <span className="flex items-center gap-1">
          <Image src="/icons/schedule/clock.svg" alt="" width={18} height={18} className="size-[18px]" />
          <span className="text-body-regular-14 text-gray-600">{event.timeLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <Image src="/icons/schedule/map-pin.svg" alt="" width={18} height={18} className="size-[18px]" />
          <span className="text-body-regular-14 text-gray-600">{event.locationLabel}</span>
        </span>
      </button>
      {onMoreClick && (
        <button type="button" onClick={onMoreClick} className="flex size-5 shrink-0 items-center justify-center">
          <Image src="/icons/schedule/edit.svg" alt="" width={20} height={20} className="size-5" />
        </button>
      )}
    </div>
  )
}

export { ScheduleListItem }
