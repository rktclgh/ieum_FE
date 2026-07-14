"use client"

import Image from "next/image"

import { HighlightedText } from "@/components/ui/highlighted-text"
import type { Place } from "@/features/map/api/place-search-api"

interface PlaceResultRowProps {
  place: Place
  query?: string
  onClick: () => void
}

function PlaceResultRow({ place, query, onClick }: PlaceResultRowProps) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-2.5 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <Image src="/icons/schedule/map-pin.svg" alt="" width={18} height={18} className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-body-semibold-15 text-gray-900">
          <HighlightedText text={place.name} query={query} />
        </p>
        <p className="truncate text-body-regular-13 text-gray-500">{place.address}</p>
      </div>
    </button>
  )
}

export { PlaceResultRow }
