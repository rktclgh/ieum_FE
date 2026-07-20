"use client"

import * as React from "react"
import Image from "next/image"

import { FullScreenOverlay, useFocusOnOverlaySettled } from "@/components/ui/full-screen-overlay"
import { SearchBox } from "@/components/ui/search-box"
import type { MapBounds } from "@/features/map/api/pin-types"
import type { Place } from "@/features/map/api/place-search-api"
import { MeetupResultCard } from "@/features/map/components/meetup-result-card"
import { PlaceResultRow } from "@/features/map/components/place-result-row"
import { QuestionResultCard } from "@/features/map/components/question-result-card"
import { SearchTabBar, type SearchTab } from "@/features/map/components/search-tab-bar"
import type { Coordinates } from "@/features/map/hooks/use-geolocation"
import { useSearchResults } from "@/features/map/hooks/use-search-results"
import { useMe } from "@/features/session/hooks/use-me"
import { APP_BAR_SAFE_TOP } from "@/lib/constants/layout"
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
  bounds: MapBounds | null
  initialQuery?: string
  onClose: () => void
  onSelectPlace: (place: Place) => void
  onOpenMeetup: (meetingId: number) => void
  onOpenQuestion: (questionId: number) => void
}

function SearchOverlayContent({
  near,
  bounds,
  initialQuery = "",
  onClose,
  onSelectPlace,
  onOpenMeetup,
  onOpenQuestion,
}: SearchOverlayContentProps) {
  const { messages } = useTranslation()
  const searchInputRef = useFocusOnOverlaySettled<HTMLInputElement>()
  // 롱프레스 번역 메뉴는 로그인 사용자에게만 뜬다(useTranslateToggle.canTranslate).
  // users/me 는 홈 화면에서 이미 채워져 있어 오버레이가 새로 요청하지 않는다.
  const { data: me } = useMe()
  const isAuthenticated = me != null
  const [query, setQuery] = React.useState(initialQuery)
  const [debounced, setDebounced] = React.useState(initialQuery)
  const [tab, setTab] = React.useState<SearchTab>("all")

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const q = debounced.trim()
  const hasQuery = q.length > 0
  // 결과는 디바운스를 따르지만 탭 노출은 키 입력에 바로 반응해야 한다 — 300ms 늦게 뜨면 끊겨 보인다.
  const isTyping = query.trim().length > 0
  const { meetups, questions, places, isLoading } = useSearchResults(debounced, near, bounds)

  // 장소 탭은 쿼리가 있을 때만 존재한다. 쿼리가 지워지면 선택 상태를 되돌리는 대신
  // 파생값으로 전체 탭처럼 취급한다 — 다시 입력하면 고르던 장소 탭으로 돌아온다.
  // 탭 노출(hidePlace)과 같은 기준으로 판단해야 한다 — 디바운스된 hasQuery를 쓰면 입력을 지운 뒤
  // 300ms 동안 장소 탭은 사라졌는데 선택 상태는 place로 남아 아무 탭도 선택되지 않아 보인다.
  const activeTab: SearchTab = !isTyping && tab === "place" ? "all" : tab

  const showMeetups = activeTab === "all" || activeTab === "meetup"
  const showQuestions = activeTab === "all" || activeTab === "question"
  const showPlaces = activeTab === "all" || activeTab === "place"
  const cap = (length: number) => (activeTab === "all" ? Math.min(length, PREVIEW_LIMIT) : length)

  // 선택된 탭에서 보이는 섹션이 모두 비었을 때만 "결과 없음"을 노출한다.
  // (예: 모임 탭에서 모임 0건이면 장소 결과가 있어도 화면이 비므로 빈 상태를 보여야 한다.)
  // 쿼리가 비어있을 때도 동일하게 적용한다 — 그때는 "주변에 표시할 항목 없음"을 뜻한다.
  const isEmpty =
    !isLoading &&
    (!showMeetups || meetups.length === 0) &&
    (!showQuestions || questions.length === 0) &&
    (!showPlaces || places.length === 0)

  return (
    <>
      {/* AppBar를 쓰지 않는 자체 헤더라 상단 safe-area를 직접 받는다 (issue #279). */}
      <div className={`flex items-center gap-2 px-4 pb-4 ${APP_BAR_SAFE_TOP}`}>
        <button
          type="button"
          aria-label={messages.common.back}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
        </button>
        <SearchBox
          // autoFocus 금지 — 진입 모션이 끝난 뒤에 포커스를 준다 (issue #384).
          ref={searchInputRef}
          tone="flat"
          placeholder={messages.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="px-4 pb-2">
        <SearchTabBar value={activeTab} onChange={setTab} hidePlace={!isTyping} />
      </div>

      {/* fixed inset-0 오버레이라 마지막 결과가 홈 인디케이터에 걸린다 (issue #279). */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(2rem+var(--safe-area-bottom))]">
        {isLoading ? (
          <div className="mt-16 flex justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          </div>
        ) : null}

        {isEmpty ? (
          <p className="mt-16 text-center text-body-regular-14 text-gray-400">
            {hasQuery ? messages.home.searchEmpty : messages.home.listEmpty}
          </p>
        ) : null}

        {showMeetups && meetups.length > 0 ? (
          <section className="mt-2">
            {activeTab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryMeetup}
              </h2>
            ) : null}
            {meetups.slice(0, cap(meetups.length)).map((pin) => (
              <MeetupResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                isAuthenticated={isAuthenticated}
                onClick={() => onOpenMeetup(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showQuestions && questions.length > 0 ? (
          <section className="mt-2">
            {activeTab === "all" ? (
              <h2 className="mb-1 mt-3 text-body-semibold-14 text-gray-900">
                {messages.home.categoryQuestion}
              </h2>
            ) : null}
            {questions.slice(0, cap(questions.length)).map((pin) => (
              <QuestionResultCard
                key={pin.pinId}
                pin={pin}
                query={q}
                isAuthenticated={isAuthenticated}
                onClick={() => onOpenQuestion(pin.targetId)}
              />
            ))}
          </section>
        ) : null}

        {showPlaces && places.length > 0 ? (
          <section className="mt-2">
            {activeTab === "all" ? (
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
