"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

/**
 * 화면 하단에 여백을 두고 떠 있는 카드형 바텀시트.
 * 기존 Drawer(전체폭·상단만 둥근 엣지 고정형)와 달리 Figma의 홈 상세 시트처럼
 * 좌우/하단 여백 + 전체 라운드 카드로 렌더링한다.
 */
interface BottomSheetProps extends Omit<DrawerPrimitive.Root.Props, "children"> {
  className?: string
  children?: React.ReactNode
}

function BottomSheet({ children, className, ...props }: BottomSheetProps) {
  return (
    <DrawerPrimitive.Root data-slot="bottom-sheet" {...props}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black/20 opacity-[calc(1_-_var(--drawer-swipe-progress))] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0" />
        {/* 시트 안에 텍스트 입력이 있는 소비자(예: 질문 답변창)를 위해 base-ui의 내장
            키보드 회피(visualViewport 추적 + 포커스 스크롤)를 켠다. 포커스 가능한
            입력 요소가 없는 소비자에게는 이벤트가 아예 발생하지 않아 동작이 그대로다. */}
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))]">
            <DrawerPrimitive.Popup
              data-slot="bottom-sheet-popup"
              className={cn(
                "flex w-full max-w-[345px] flex-col items-center gap-4 rounded-3xl bg-white px-4 pt-6 pb-5 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-y-[calc(100%_+_2rem)] data-starting-style:translate-y-[calc(100%_+_2rem)]",
                className
              )}
            >
              {children}
            </DrawerPrimitive.Popup>
          </DrawerPrimitive.Viewport>
        </DrawerPrimitive.VirtualKeyboardProvider>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

const BottomSheetClose = DrawerPrimitive.Close

export { BottomSheet, BottomSheetClose }
