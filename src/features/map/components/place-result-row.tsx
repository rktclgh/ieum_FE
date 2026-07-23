"use client"

import { HighlightedText } from "@/components/ui/highlighted-text"
import { Icon } from "@/components/ui/icon"
import type { Place } from "@/features/map/api/place-search-api"

interface PlaceResultRowProps {
  place: Place
  query?: string
  onClick: () => void
}

function PlaceResultRow({ place, query, onClick }: PlaceResultRowProps) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 py-2.5 text-left">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
        <Icon name="map/location-pin" width={24} height={24} className="size-6" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-title-semibold-16 text-gray-900">
          <HighlightedText text={place.name} query={query} />
        </p>
        <p className="truncate text-body-regular-14 text-gray-600">{place.address}</p>
      </div>
    </button>
  )
}

export { PlaceResultRow }
