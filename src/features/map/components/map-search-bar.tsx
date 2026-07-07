"use client"

import * as React from "react"
import Image from "next/image"

import { SearchBox } from "@/components/ui/search-box"
import type { Place } from "@/features/map/api/place-search-api"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MapSearchBarProps {
  near: Coordinates | null
  onSelectPlace: (place: Place) => void
  selectedLocationLabel?: string | null
  onClearSelectedLocation?: () => void
  className?: string
}

function MapSearchBar({
  near,
  onSelectPlace,
  selectedLocationLabel,
  onClearSelectedLocation,
  className,
}: MapSearchBarProps) {
  const { messages } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const skipNextDebounceRef = React.useRef(false)

  React.useEffect(() => {
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false
      return
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: places } = usePlaceSearch(debouncedQuery, near)

  if (selectedLocationLabel) {
    return (
      <div className={className ?? "relative flex-1"}>
        <div className="flex h-[45px] w-full items-center justify-between gap-3 rounded-full bg-gray-50 px-4 py-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50">
          <span className="truncate text-body-medium-15 text-gray-900">
            {messages.home.selectedLocationPrefix}: {selectedLocationLabel}
          </span>
          {onClearSelectedLocation && (
            <button
              type="button"
              aria-label={messages.home.clearSelectedLocationLabel}
              onClick={onClearSelectedLocation}
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-200"
            >
              <Image src="/icons/common/clear.svg" alt="" width={8} height={8} className="size-2" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? "relative flex-1"}>
      <SearchBox
        placeholder={messages.home.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {places && places.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl bg-white p-2 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.10)]">
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 rounded-xl p-2 text-left hover:bg-gray-50"
                onClick={() => {
                  onSelectPlace(place)
                  skipNextDebounceRef.current = true
                  setQuery(place.name)
                  setDebouncedQuery("")
                }}
              >
                <span className="text-body-medium-14 text-gray-900">{place.name}</span>
                <span className="text-body-regular-12 text-gray-500">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { MapSearchBar }
