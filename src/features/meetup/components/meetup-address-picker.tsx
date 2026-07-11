"use client"

import * as React from "react"

import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport,
} from "@/components/ui/drawer"
import type { MeetupPlaceValue } from "@/features/meetup/constants/create-meetup"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { usePlaceSearch } from "@/features/map/hooks/use-place-search"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupAddressPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  near: Coordinates | null
  onConfirm: (value: MeetupPlaceValue) => void
}

/**
 * 장소 선택 바텀시트. 지도 Place 검색(/api/places)으로 좌표까지 확보해
 * POST /meetings 의 location(LocationSnapshot)에 필요한 lat/lng/address 를 채운다.
 */
function MeetupAddressPicker({ open, onOpenChange, near, onConfirm }: MeetupAddressPickerProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: places } = usePlaceSearch(debouncedQuery, near)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup>
            <DrawerContent className="gap-3 pb-2">
              <div className="flex h-[3.375rem] w-full items-center gap-2 rounded-xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.addressSearchPlaceholder}
                  className="w-full bg-transparent text-body-medium-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
                />
              </div>

              {places && places.length > 0 ? (
                <ul className="flex max-h-64 w-full flex-col gap-1 overflow-y-auto">
                  {places.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 rounded-xl p-2 text-left hover:bg-gray-50"
                        onClick={() => {
                          onConfirm({
                            lat: place.lat,
                            lng: place.lng,
                            address: place.address,
                            label: place.name,
                          })
                          onOpenChange(false)
                        }}
                      >
                        <span className="text-body-medium-14 text-gray-900">{place.name}</span>
                        <span className="text-body-regular-12 text-gray-500">{place.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : debouncedQuery.trim().length > 0 ? (
                <p className="w-full px-2 py-4 text-center text-body-regular-14 text-gray-400">
                  {t.addressNoResults}
                </p>
              ) : null}
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}

export { MeetupAddressPicker }
