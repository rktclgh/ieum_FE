"use client"

import * as React from "react"

import {
  CONTEXT_MENU_LABEL_BASE_SIZE,
  CONTEXT_MENU_LABEL_CLASS,
  fitContextMenuPanelLabelSize,
  type ContextMenuLabelSize,
} from "@/features/chat/lib/context-menu-label-fit"
import { cn } from "@/lib/utils"
import { LONG_PRESS_TARGET_PROPS, LONG_PRESS_TRANSITION } from "@/lib/long-press-styles"

interface ChatContextMenuItem {
  icon: React.ReactNode
  label: string
  tone?: "default" | "destructive"
  disabled?: boolean
  onClick?: () => void
}

interface ChatContextMenuProps extends React.ComponentProps<"div"> {
  items: ChatContextMenuItem[]
  /** true면 뒤 배경에 반투명 딤 오버레이를 함께 렌더 (롱프레스 메뉴), false면 팝업만 (카메라 버튼 등) */
  dimmed?: boolean
  /**
   * 딤 오버레이 클래스 확장. 이미 딤이 깔린 곳(바텀시트 backdrop) 위에서는 `bg-transparent`
   * 를 넘겨 어둡기를 겹치지 않게 하고, 바깥 탭으로 메뉴만 닫는 용도로만 쓴다.
   */
  scrimClassName?: string
  onDismiss?: () => void
}

/**
 * 삭제된 LongPressActionOverlay가 갖고 있던 접근성(role="menu"/"menuitem", Escape 닫기)을
 * 이 컴포넌트로 옮겼다 — 채팅 목록·채팅방·공지·일정·친구·프로필·모임 이미지 등 롱프레스
 * 메뉴를 쓰는 모든 화면이 이 컴포넌트 하나를 공유한다.
 */
function ChatContextMenu({
  className,
  items,
  dimmed = false,
  scrimClassName,
  onDismiss,
  style,
  ...props
}: ChatContextMenuProps) {
  // 조건부 마운트라 첫 페인트에 이미 최종 상태면 트랜지션이 돌지 않는다.
  // 초기 상태로 한 프레임 그린 뒤 enter 상태로 넘겨야 눌린 아이템의 리프트와 같은 리듬으로 떠오른다.
  //
  // rAF 를 두 번 겹치는 이유: 이 메뉴는 롱프레스(discrete 이벤트)에서 열리는데, React 가
  // 그 이벤트 끝에서 passive effect 를 페인트 전에 flush 하면 단일 rAF 콜백도 같은 페인트
  // 안에서 실행되어 entered=true 인 채로 첫 페인트가 나간다 — 트랜지션이 통째로 생략된다.
  // 두 번째 rAF 는 반드시 다음 페인트 직전이라 초기 상태가 최소 한 프레임 그려지는 걸 보장한다.
  const [entered, setEntered] = React.useState(false)
  React.useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  React.useEffect(() => {
    if (!onDismiss) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onDismiss])

  // 라벨 크기 자동 맞춤. 번역된 라벨은 언어마다 길이가 달라 고정 폭(w-[193px])을 넘길 수 있는데,
  // 줄바꿈이 일어나면 항목 높이가 40px 를 넘어 contextMenuHeight() 배치 계산이 어긋난다.
  const labelBoxRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const labelTextRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const [labelSize, setLabelSize] = React.useState<ContextMenuLabelSize>(
    CONTEXT_MENU_LABEL_BASE_SIZE
  )
  // 라벨이 그대로면 다시 잴 이유가 없다. items 는 렌더마다 새 배열이라 참조를 쓸 수 없다.
  const labelKey = items.map((item) => item.label).join(" ")

  // 라벨이 바뀌면 기준 크기로 되돌린 뒤 다시 잰다(렌더 중 상태 조정 — React 권장 패턴).
  // 줄어든 상태로 재면 짧아진 라벨이 가용폭에 꽉 찬 것처럼 측정돼("번역 중..." → "번역")
  // 다시 커지지 못하고 작은 크기에 갇힌다.
  const [measuredKey, setMeasuredKey] = React.useState(labelKey)
  if (measuredKey !== labelKey) {
    setMeasuredKey(labelKey)
    setLabelSize(CONTEXT_MENU_LABEL_BASE_SIZE)
  }

  React.useLayoutEffect(() => {
    const measure = () => {
      const measurements = labelBoxRefs.current.flatMap((box, index) => {
        const text = labelTextRefs.current[index]
        if (!box || !text) return []
        return [
          {
            availableWidth: box.clientWidth,
            // 지금 적용된 크기로 잰 폭을 기준 크기(15px) 기준으로 환산한다.
            // 폭은 폰트 크기에 비례하므로 한 번의 환산으로 값이 수렴한다.
            naturalWidth: text.scrollWidth * (CONTEXT_MENU_LABEL_BASE_SIZE / labelSize),
          },
        ]
      })
      const next = fitContextMenuPanelLabelSize(measurements)
      setLabelSize((current) => (current === next ? current : next))
    }

    measure()

    // Pretendard 가 늦게 붙으면 폭이 달라진다. 로드 후 한 번만 다시 잰다.
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    return () => {
      cancelled = true
    }
  }, [labelKey, labelSize])

  return (
    <>
      {dimmed && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/10",
            LONG_PRESS_TRANSITION,
            entered ? "opacity-100" : "opacity-0",
            scrimClassName
          )}
          onClick={onDismiss}
          role="presentation"
        />
      )}
      <div
        data-slot="chat-context-menu"
        role="menu"
        className={cn(
          "absolute z-50 flex flex-col gap-1 rounded-3xl bg-white/80 px-6 py-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm",
          LONG_PRESS_TRANSITION,
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0",
          className
        )}
        style={style}
        // 메뉴 항목 텍스트도 길게 누르면 선택되어 앱 메뉴 위에 OS 편집 메뉴가 겹친다.
        {...LONG_PRESS_TARGET_PROPS}
        {...props}
      >
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={item.onClick}
            className="flex w-[193px] items-center gap-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.icon}
            {/* 바깥 span 이 가용폭, 안쪽 span 이 라벨의 자연 폭 — 둘의 비로 크기를 정한다. */}
            <span
              ref={(node) => {
                labelBoxRefs.current[index] = node
              }}
              className="min-w-0 flex-1 overflow-hidden"
            >
              <span
                ref={(node) => {
                  labelTextRefs.current[index] = node
                }}
                className={cn(
                  "block truncate whitespace-nowrap",
                  CONTEXT_MENU_LABEL_CLASS[labelSize],
                  item.tone === "destructive" ? "text-red" : "text-gray-900"
                )}
              >
                {item.label}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

export { ChatContextMenu }
export type { ChatContextMenuItem }
