"use client"

import * as React from "react"
import Image from "next/image"

import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
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

interface SearchOverlayProps extends SearchOverlayContentProps {
  open: boolean
}

/**
 * 검색 결과 fetch·디바운스 상태는 Content가 들고 있고, 오버레이가 닫히면 Content가 언마운트되므로
 * 다시 열 때 항상 빈 검색어에서 시작한다(기존 조건부 마운트와 동일한 동작).
 */
function SearchOverlay({ open, ...props }: SearchOverlayProps) {
  return (
    <FullScreenOverlay
      open={open}
      className="z-40 app-column flex flex-col bg-white"
    >
      <SearchOverlayContent {...props} />
    </FullScreenOverlay>
  )
}

interface SearchOverlayContentProps {
  near: Coordinates | null
  initialQuery?: string
  onClose: () => void
  onSelectPlace: (place: Place) => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
}

function SearchOverlayContent({
  near,
  initialQuery = "",
  onClose,
  onSelectPlace,
  onOpenMeetup,
  onOpenQuestion,
}: SearchOverlayContentProps) {
  const { messages } = useTranslation()
  const [query, setQuery] = React.useState(initialQuery)
  const [debounced, setDebounced] = React.useState(initialQuery)
  const [tab, setTab] = React.useState<SearchTab>("all")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { meetups, questions, places, isLoading } = useSearchResults(debounced, near)
  const q = debounced.trim()

  const showMeetups = tab === "all" || tab === "meetup"
  const showQuestions = tab === "all" || tab === "question"
  const showPlaces = tab === "all" || tab === "place"
  const cap = (length: number) => (tab === "all" ? Math.min(length, PREVIEW_LIMIT) : length)

  // 선택된 탭에서 보이는 섹션이 모두 비었을 때만 "결과 없음"을 노출한다.
  // (예: 모임 탭에서 모임 0건이면 장소 결과가 있어도 화면이 비므로 빈 상태를 보여야 한다.)
  const isEmpty =
    !isLoading &&
    q.length > 0 &&
    (!showMeetups || meetups.length === 0) &&
    (!showQuestions || questions.length === 0) &&
    (!showPlaces || places.length === 0)

  return (
    <>
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
        {isLoading && q.length > 0 ? (
          <div className="mt-16 flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          </div>
        ) : null}

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
    </>
  )
}

export { SearchOverlay }
