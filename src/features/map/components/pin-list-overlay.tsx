"use client"

import * as React from "react"

import { AppBar } from "@/components/ui/app-bar"
import { SearchBox } from "@/components/ui/search-box"
import type { MapBounds } from "@/features/map/api/pin-types"
import { CategoryChipGroup, type Category } from "@/features/map/components/category-chip-group"
import { MapFab } from "@/features/map/components/map-fab"
import { MeetupResultCard } from "@/features/map/components/meetup-result-card"
import { QuestionResultCard } from "@/features/map/components/question-result-card"
import { useMapPins } from "@/features/map/hooks/use-map-pins"
import { FAB_BOTTOM_FLOOR } from "@/lib/constants/layout"
import { hangulIncludes } from "@/lib/hangul-includes"
import { useTranslation } from "@/lib/i18n/use-translation"

interface PinListOverlayProps {
  bounds: MapBounds | null
  onClose: () => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
  onCreateMeetup: () => void
  onCreateQuestion: () => void
}

// 지금 지도에 보이는(바운즈) 핀을 리스트로 보여준다. 탭/인리스트 검색은 클라이언트 필터.
function PinListOverlay({
  bounds,
  onClose,
  onOpenMeetup,
  onOpenQuestion,
  onCreateMeetup,
  onCreateQuestion,
}: PinListOverlayProps) {
  const { messages } = useTranslation()
  const [category, setCategory] = React.useState<Category>("all")
  const [query, setQuery] = React.useState("")

  const { data: pinData, isLoading } = useMapPins(bounds)
  const pins = pinData?.pins ?? []

  const trimmed = query.trim()
  const filtered = pins.filter((pin) => {
    const typeOk =
      category === "all" ||
      (category === "meetup" && pin.pinType === "meeting") ||
      (category === "question" && pin.pinType === "question")
    return typeOk && hangulIncludes(pin.title, trimmed)
  })

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--keyboard-inset,0px)] z-40 app-column flex flex-col bg-white">
      <AppBar
        title={messages.home.listTitle}
        leadingIcon={null}
        trailingVariant="close"
        onTrailingClick={onClose}
      />

      <div className="px-4 pb-2">
        <SearchBox
          tone="flat"
          placeholder={messages.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="px-4 pb-2">
        <CategoryChipGroup value={category} onChange={setCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="mt-16 flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-16 text-center text-body-regular-14 text-gray-400">
            {messages.home.listEmpty}
          </p>
        ) : (
          filtered.map((pin) =>
            pin.pinType === "meeting" ? (
              <MeetupResultCard
                key={pin.pinId}
                pin={pin}
                onClick={() => onOpenMeetup(pin.targetId)}
              />
            ) : (
              <QuestionResultCard
                key={pin.pinId}
                pin={pin}
                onClick={() => onOpenQuestion(pin.targetId)}
              />
            )
          )
        )}
      </div>

      <MapFab
        onCreateMeetup={onCreateMeetup}
        onCreateQuestion={onCreateQuestion}
        className={`absolute right-4 ${FAB_BOTTOM_FLOOR} z-10`}
      />
    </div>
  )
}

export { PinListOverlay }
