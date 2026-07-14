"use client"

import * as React from "react"
import Image from "next/image"

import { SearchBox } from "@/components/ui/search-box"
import type { Place } from "@/features/map/api/place-search-api"
import { MeetupResultCard } from "@/features/map/components/meetup-result-card"
import { PlaceResultRow } from "@/features/map/components/place-result-row"
import { QuestionResultCard } from "@/features/map/components/question-result-card"
import { SearchTabBar, type SearchTab } from "@/features/map/components/search-tab-bar"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useSearchResults } from "@/features/map/hooks/use-search-results"
import { useTranslation } from "@/lib/i18n/use-translation"

// "전체" 탭에서 타입별로 미리보기할 최대 개수(상세 fetch 부담 제한).
const PREVIEW_LIMIT = 3

interface SearchOverlayProps {
  near: Coordinates | null
  initialQuery?: string
  onClose: () => void
  onSelectPlace: (place: Place) => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
}

function SearchOverlay({
  near,
  initialQuery = "",
  onClose,
  onSelectPlace,
  onOpenMeetup,
  onOpenQuestion,
}: SearchOverlayProps) {
  const { messages } = useTranslation()
  const [query, setQuery] = React.useState(initialQuery)
  const [debounced, setDebounced] = React.useState(initialQuery)
  const [tab, setTab] = React.useState<SearchTab>("all")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { meetups, questions, places } = useSearchResults(debounced, near)
  const q = debounced.trim()

  const showMeetups = tab === "all" || tab === "meetup"
  const showQuestions = tab === "all" || tab === "question"
  const showPlaces = tab === "all" || tab === "place"
  const cap = (length: number) => (tab === "all" ? Math.min(length, PREVIEW_LIMIT) : length)

  const isEmpty =
    q.length > 0 && meetups.length === 0 && questions.length === 0 && places.length === 0

  return (
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-sm flex-col bg-white">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          aria-label={messages.common.back}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
        </button>
        <SearchBox
          autoFocus
          tone="flat"
          placeholder={messages.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="px-4 pb-2">
        <SearchTabBar value={tab} onChange={setTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {isEmpty ? (
          <p className="mt-16 text-center text-body-regular-14 text-gray-400">
            {messages.home.searchEmpty}
          </p>
        ) : null}

        {showMeetups && meetups.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryMeetup}
              </h2>
            ) : null}
            {meetups.slice(0, cap(meetups.length)).map((pin) => (
              <MeetupResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                onClick={() => onOpenMeetup(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showQuestions && questions.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryQuestion}
              </h2>
            ) : null}
            {questions.slice(0, cap(questions.length)).map((pin) => (
              <QuestionResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                onClick={() => onOpenQuestion(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showPlaces && places.length > 0 ? (
          <section className="mt-2">
            {tab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryPlace}
              </h2>
            ) : null}
            {places.slice(0, cap(places.length)).map((place) => (
              <PlaceResultRow
                key={place.id}
                place={place}
                query={q}
                onClick={() => onSelectPlace(place)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  )
}

export { SearchOverlay }
