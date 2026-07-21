"use client"

import * as React from "react"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import type { MapPin } from "@/features/map/api/pin-types"
import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"
import { QuestionDetailContainer } from "@/features/question/components/question-detail-container"
import { LiftSurfaceProvider, useLiftSurfaceState } from "@/lib/hooks/use-lift-surface"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { cn } from "@/lib/utils"

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

/**
 * 롱프레스 메뉴가 카드 위쪽에 뜰 때 트랙이 열어주는 여백.
 *
 * 트랙은 가로 스크롤(overflow-x-auto)이라 CSS 규칙상 세로도 함께 클리핑된다 — 카드 위로
 * 삐져나온 메뉴가 그냥 잘린다. 시트는 화면 하단 정렬이라 이 여백이 생기면 위로 자란다.
 * 값: 1항목 메뉴 64px + 카드와의 간격 12px = 76 → 80px(pt-20).
 */
const MENU_HEADROOM = "pt-20"

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
  // 롱프레스로 떠오른 슬라이드. 그 카드 위에 뜨는 메뉴가 잘리지 않게 트랙 위쪽을 열어둔다.
  const [liftedIndex, setLiftedIndex] = React.useState<number | null>(null)

  const handleLiftedChange = React.useCallback((index: number, lifted: boolean) => {
    setLiftedIndex((current) => (lifted ? index : current === index ? null : current))
  }, [])

  // 한 번이라도 창에 들어온 슬라이드는 계속 마운트해 둔다(지연 마운트).
  // 언마운트하면 질문 카드에 입력하던 답변 텍스트와 첨부 사진이 스와이프만으로 날아간다.
  // 조회는 마운트될 때 한 번 나가고 폴링이 없으므로, 계속 두어도 요청이 늘지 않는다.
  //
  // 방문 이력을 Set이 아니라 [min, max] 범위로 들고 있는 이유: 스와이프는 연속이라 방문 구간이
  // 항상 이어져 있고, 범위는 상태로 두면 렌더 중 ref를 건드리지 않아도 된다(react-hooks/refs).
  const [mountedRange, setMountedRange] = React.useState(() => ({
    min: 0,
    max: Math.min(RENDER_WINDOW, pins.length - 1),
  }))

  // 스크롤 위치에서 활성 슬라이드를 구한다.
  //
  // 앞쪽 스페이서 폭이 정확히 (트랙폭 - 슬라이드폭)/2 이므로, i번 슬라이드가 중앙에 설 때
  // scrollLeft는 정확히 i * 슬라이드폭이 된다(스페이서가 상쇄된다). 따라서 나눗셈 한 번이면
  // 되고, 슬라이드를 전부 훑으며 offsetLeft를 읽지 않아도 된다 — 스크롤 이벤트는 매우 잦아
  // 슬라이드 수만큼 레이아웃을 강제로 읽으면 저사양 기기에서 버벅인다.
  // snap이 끝나기 전에도 인덱스 표시가 따라오도록 스크롤마다 계산하되, 값이 바뀔 때만 렌더한다.
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return

    const firstSlide = track.querySelector<HTMLElement>("[data-pin-stack-slide]")
    const slideWidth = firstSlide?.offsetWidth ?? 0
    if (slideWidth <= 0) return

    const nearest = Math.min(
      pins.length - 1,
      Math.max(0, Math.round(track.scrollLeft / slideWidth))
    )

    setActiveIndex((current) => (current === nearest ? current : nearest))
    setMountedRange((range) => {
      const min = Math.max(0, nearest - RENDER_WINDOW)
      const max = Math.min(pins.length - 1, nearest + RENDER_WINDOW)
      if (min >= range.min && max <= range.max) return range
      return { min: Math.min(range.min, min), max: Math.max(range.max, max) }
    })
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
          className={cn(
            "flex w-full items-end snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            LONG_PRESS_TRANSITION,
            liftedIndex === null ? "pt-0" : MENU_HEADROOM
          )}
        >
          <StackSpacer />
          {pins.map((pin, index) => (
            <div
              key={pin.pinId}
              data-pin-stack-slide
              className="w-[var(--pin-stack-slide)] shrink-0 snap-center px-1.5"
            >
              <StackCard index={index} onLiftedChange={handleLiftedChange}>
                {index >= mountedRange.min && index <= mountedRange.max ? (
                  pin.pinType === "meeting" ? (
                    <MeetupDetailContainer
                      variant="card"
                      meetingId={pin.targetId}
                      active={index === activeIndex}
                    />
                  ) : (
                    <QuestionDetailContainer
                      variant="card"
                      questionId={pin.targetId}
                      active={index === activeIndex}
                    />
                  )
                ) : (
                  <div className="h-56 w-full" />
                )}
              </StackCard>
            </div>
          ))}
          <StackSpacer />
        </div>
      </div>
    </BottomSheet>
  )
}

/**
 * 슬라이드 한 장의 흰 카드. 단일 시트에서는 시트 팝업이 하는 두 가지 역할을 여기서 대신한다.
 * (1) 롱프레스 시 떠오르는 표면, (2) 카드가 여는 번역 메뉴의 위치 기준(relative).
 * 캐러셀에서는 시트가 아니라 눌린 카드 한 장만 떠올라야 한다.
 */
function StackCard({
  index,
  onLiftedChange,
  children,
}: {
  index: number
  onLiftedChange: (index: number, lifted: boolean) => void
  children: React.ReactNode
}) {
  const { lifted, setLifted } = useLiftSurfaceState()

  // 트랙이 세로로 클리핑하므로(아래 MENU_HEADROOM 참고) 부모가 공간을 열어줘야 한다.
  React.useEffect(() => {
    onLiftedChange(index, lifted)
  }, [index, lifted, onLiftedChange])

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center gap-4 rounded-3xl bg-white px-4 pt-6 pb-5 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]",
        LONG_PRESS_TRANSITION,
        lifted ? LONG_PRESS_LIFT_ACTIVE : LONG_PRESS_INACTIVE
      )}
    >
      <LiftSurfaceProvider value={setLifted}>{children}</LiftSurfaceProvider>
    </div>
  )
}

/** 첫/마지막 슬라이드가 트랙 중앙에 설 수 있게 하는 좌우 여백. */
function StackSpacer() {
  return <div aria-hidden className="w-[calc((100%_-_var(--pin-stack-slide))_/_2)] shrink-0" />
}

export { PinStackSheet }
