"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LONG_PRESS_TRANSITION } from "@/lib/long-press-styles"

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
  onDismiss?: () => void
}

/**
 * 삭제된 LongPressActionOverlay가 갖고 있던 접근성(role="menu"/"menuitem", Escape 닫기)을
 * 이 컴포넌트로 옮겼다 — 채팅 목록·채팅방·공지·일정·친구·프로필·모임 이미지 등 롱프레스
 * 메뉴를 쓰는 모든 화면이 이 컴포넌트 하나를 공유한다.
 */
function ChatContextMenu({ className, items, dimmed = false, onDismiss, style, ...props }: ChatContextMenuProps) {
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

  return (
    <>
      {dimmed && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/10",
            LONG_PRESS_TRANSITION,
            entered ? "opacity-100" : "opacity-0"
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
            <span
              className={cn(
                "text-body-medium-15",
                item.tone === "destructive" ? "text-red" : "text-gray-900"
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

export { ChatContextMenu }
export type { ChatContextMenuItem }
