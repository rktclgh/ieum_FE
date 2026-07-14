"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface LongPressAction {
  icon: React.ReactNode
  label: string
  tone?: "default" | "destructive"
  onClick: () => void
}

interface LongPressActionOverlayProps {
  /** 눌린 행의 화면 좌표(getBoundingClientRect 결과) */
  anchorRect: DOMRect
  /** 부상시켜 보여줄 활성 행 콘텐츠 */
  children: React.ReactNode
  actions: LongPressAction[]
  onDismiss: () => void
}

// 활성 행 부상 폭: 디자인상 375 → 343 (좌우 16 거터). 위아래 여백 10px.
const ACTIVE_ROW_MAX_WIDTH = 343
const MENU_GAP = 8

function LongPressActionOverlay({
  anchorRect,
  children,
  actions,
  onDismiss,
}: LongPressActionOverlayProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onDismiss])

  // 활성 행: 원래 세로 위치(top)에 고정, 가로는 화면 중앙 정렬(max 343).
  const rowTop = Math.max(anchorRect.top - 10, 12)
  // 메뉴: 활성 행 아래에 앵커. 좌측 정렬은 활성 행 좌측과 맞춤.
  const menuTop = rowTop + anchorRect.height + 20 + MENU_GAP

  return (
    <div className="fixed inset-0 z-[60]">
      {/* dim 배경 — 클릭 시 닫힘 */}
      <div
        className="absolute inset-0 bg-black/30"
        role="presentation"
        aria-hidden
        onClick={onDismiss}
      />

      {/* 부상한 활성 행 (탭하면 닫힘) */}
      <div
        className="absolute left-1/2 w-full -translate-x-1/2 px-4"
        style={{ top: rowTop, maxWidth: ACTIVE_ROW_MAX_WIDTH + 32 }}
        onClick={onDismiss}
      >
        <div className="rounded-2xl bg-white py-2.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.16)]">
          {children}
        </div>
      </div>

      {/* 앵커된 액션 메뉴 */}
      <div
        role="menu"
        className="absolute left-1/2 -translate-x-1/2 px-4"
        style={{ top: menuTop, maxWidth: ACTIVE_ROW_MAX_WIDTH + 32 }}
      >
        <div className="w-[193px] rounded-3xl bg-white/90 px-6 py-2 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                action.onClick()
                onDismiss()
              }}
              className="flex w-full items-center gap-2 py-2.5 text-left"
            >
              {action.icon}
              <span
                className={cn(
                  "text-body-medium-15",
                  action.tone === "destructive" ? "text-red" : "text-gray-900"
                )}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { LongPressActionOverlay }
export type { LongPressAction, LongPressActionOverlayProps }
