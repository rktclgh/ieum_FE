"use client"

import * as React from "react"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import type { MapPin } from "@/features/map/api/pin-types"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import { QuestionDetailContainer } from "@/features/question/components/question-detail-container"
import { useTranslation } from "@/lib/i18n/use-translation"

/**
 * 슬라이드 폭 = 카드 폭 + 카드 사이 간격(12px).
 *
 * 좌우로 이웃 카드가 살짝 보이도록 화면보다 좁게 잡되, 카드 자체는 단일 시트와 같은
 * 최대 폭(345px)을 넘지 않는다. 간격은 슬라이드 안쪽 좌우 패딩(6px씩 = px-1.5)으로 만들어
 * flex gap 대신 슬라이드 폭에 포함시킨다 — gap을 쓰면 앞쪽 스페이서 뒤에도 gap이 붙어
 * 첫 카드가 중앙에서 밀린다. 앞뒤 스페이서가 이 값에 맞춰 첫/마지막 슬라이드를 중앙에 세운다.
 *
 * ★ 이 값을 바꾸면 슬라이드의 px-* 도 절반값으로 함께 바꿔야 한다(12px → px-1.5).
 *   둘이 어긋나면 스냅 중앙 정렬이 카드마다 조금씩 틀어진다.
 */
const SLIDE_GAP_PX = 12
const SLIDE_WIDTH = `min(${345 + SLIDE_GAP_PX}px, calc(100% - 3rem))`

/** 활성 슬라이드 기준 좌우 몇 장까지 실제 내용을 렌더할지. 나머지는 자리만 잡아 조회를 아낀다. */
const RENDER_WINDOW = 1

interface PinStackSheetProps {
  /** 같은 좌표에 겹쳐 있어 지도에서 분리할 수 없는 핀들 */
  pins: MapPin[]
  onClose: () => void
}

/**
 * 좌표가 겹친 핀들을 가로 스와이프 캐러셀로 보여주는 바텀시트.
 *
 * 확대해도 분리되지 않는 핀 더미의 유일한 열람 경로다. 카드 본문은 단일 상세 시트와 같은
 * 컨테이너(variant="card")를 재사용하므로 조회·액션 로직이 한 곳에만 존재한다.
 *
 * scroll-snap으로 구현한다(캐러셀 의존성 없음). 첫/마지막 슬라이드를 중앙에 맞추는 여백은
 * 스크롤 컨테이너의 padding 대신 스페이서 요소로 준다 — flex 스크롤 컨테이너의 끝쪽 padding은
 * 브라우저에 따라 무시되어 마지막 카드가 중앙에 서지 못한다.
 */
function PinStackSheet({ pins, onClose }: PinStackSheetProps) {
  const { messages } = useTranslation()
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)

  // 스크롤 위치에서 화면 중앙에 가장 가까운 슬라이드를 활성으로 삼는다.
  // snap이 끝나기 전에도 인덱스 표시가 따라오도록 스크롤마다 계산하되, 값이 바뀔 때만 렌더한다.
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return

    const trackCenter = track.scrollLeft + track.clientWidth / 2
    const slides = track.querySelectorAll<HTMLElement>("[data-pin-stack-slide]")

    let nearest = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - trackCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    })

    setActiveIndex((current) => (current === nearest ? current : nearest))
  }

  return (
    <BottomSheet
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      viewportClassName="px-0"
      className="max-w-none bg-transparent p-0 shadow-none"
    >
      <div
        className="app-column flex w-full flex-col items-center gap-2"
        style={{ "--pin-stack-slide": SLIDE_WIDTH } as React.CSSProperties}
      >
        <span className="rounded-full bg-gray-900/70 px-3 py-1 text-body-medium-12 text-white">
          {messages.home.pinStackIndexLabel(activeIndex + 1, pins.length)}
        </span>

        <div
          ref={trackRef}
          onScroll={handleScroll}
          // items-end: 카드 높이는 내용에 따라 제각각이므로(모임은 짧고, 아바타가 있는 질문은 길다)
          // 바닥을 기준선으로 맞춰야 스와이프할 때 카드가 위아래로 튀지 않는다.
          className="flex w-full items-end snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <StackSpacer />
          {pins.map((pin, index) => (
            <div
              key={pin.pinId}
              data-pin-stack-slide
              className="w-[var(--pin-stack-slide)] shrink-0 snap-center px-1.5"
            >
              <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-white px-4 pt-6 pb-5 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]">
                {Math.abs(index - activeIndex) <= RENDER_WINDOW ? (
                  pin.pinType === "meeting" ? (
                    <MeetupDetailContainer variant="card" meetingId={pin.targetId} />
                  ) : (
                    <QuestionDetailContainer variant="card" questionId={pin.targetId} />
                  )
                ) : (
                  <div className="h-56 w-full" />
                )}
              </div>
            </div>
          ))}
          <StackSpacer />
        </div>
      </div>
    </BottomSheet>
  )
}

/** 첫/마지막 슬라이드가 트랙 중앙에 설 수 있게 하는 좌우 여백. */
function StackSpacer() {
  return <div aria-hidden className="w-[calc((100%_-_var(--pin-stack-slide))_/_2)] shrink-0" />
}

export { PinStackSheet }
