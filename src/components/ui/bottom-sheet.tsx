"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { SHEET_BOTTOM_GAP } from "@/lib/constants/layout"
import { ScreenOverlayMarker } from "@/lib/overlay/screen-overlay"
import { cn } from "@/lib/utils"
import { useSheetKeyboardInset } from "@/lib/viewport/use-sheet-keyboard-inset"

/**
 * 화면 하단에 여백을 두고 떠 있는 카드형 바텀시트.
 * 기존 Drawer(전체폭·상단만 둥근 엣지 고정형)와 달리 Figma의 홈 상세 시트처럼
 * 좌우/하단 여백 + 전체 라운드 카드로 렌더링한다.
 */
interface BottomSheetProps extends Omit<DrawerPrimitive.Root.Props, "children"> {
  className?: string
  /**
   * Viewport(팝업을 감싸는 영역) 클래스 확장.
   * 기본 좌우 여백(px-4)을 지워 화면 끝까지 쓰는 콘텐츠(가로 캐러셀 등)에 쓴다.
   */
  viewportClassName?: string
  children?: React.ReactNode
}

function BottomSheet({ children, className, viewportClassName, ...props }: BottomSheetProps) {
  // 키보드가 뜨면 시트를 그 위로 올린다(issue #458). base-ui의 VirtualKeyboardProvider는
  // `--drawer-keyboard-inset`을 **노출만** 하고 적용은 소비자 몫인데, 그 값의 판정식이
  // iOS에서 무력해(아래 주석) 여기서 직접 잰다.
  const viewportRef = useSheetKeyboardInset()

  return (
    <DrawerPrimitive.Root data-slot="bottom-sheet" {...props}>
      <DrawerPrimitive.Portal>
        {/* Portal 안쪽은 시트가 열려 있는 동안에만(퇴장 모션 포함) 마운트되므로, 여기서 등록하면
            controlled/uncontrolled 어느 쪽으로 열리든 노출 수명과 정확히 겹친다.
            backdrop이 `bg-black/20` 반투명이라 z-index만으로는 아래의 탭바를 가리지 못한다. */}
        <ScreenOverlayMarker />
        <DrawerPrimitive.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black/20 opacity-[calc(1_-_var(--drawer-swipe-progress))] transition-opacity duration-base ease-base data-ending-style:opacity-0 data-starting-style:opacity-0" />
        {/* 시트 안에 텍스트 입력이 있는 소비자(예: 질문 답변창)를 위해 base-ui의 내장
            키보드 회피(포커스된 필드를 시트 내부 스크롤 컨테이너에서 가운데로 스크롤)를 켠다.
            포커스 가능한 입력 요소가 없는 소비자에게는 이벤트가 아예 발생하지 않는다.

            단, **시트 자체를 키보드 위로 올리는 일은 이쪽이 하지 못한다.** 두 가지 이유다.
            (1) base-ui는 `--drawer-keyboard-inset`을 노출만 하고 적용은 소비자 몫이다.
            (2) 그 값의 판정식이 `innerHeight - visualViewport.height`인데, iOS에서는 둘이 함께
                줄어 0이 되어 문턱값(60)에 걸린다 — #431이 실측으로 폐기한 공식이다.
            그래서 시트를 올리는 책임은 아래 `useSheetKeyboardInset`이 진다(#458). */}
        <DrawerPrimitive.VirtualKeyboardProvider>
          <DrawerPrimitive.Viewport
            ref={viewportRef}
            className={cn(
              // bottom-sheet-viewport: standalone(black-translucent)에서 inset-0(812) 대신 100lvh로
              // 늘려 items-end가 물리 바닥(874)에 정렬되게 한다(globals.css). 없으면 시트가 62px 뜬다.
              "bottom-sheet-viewport fixed inset-0 z-50 flex items-end justify-center px-4",
              // 탭바와 같은 기준선(28px)에서 뜨고, 키보드가 있으면 그만큼 더 올라간다.
              // 시트가 탭바를 덮으므로 기준선이 어긋나면 모서리가 삐져나온다.
              SHEET_BOTTOM_GAP,
              // 키보드와 **함께** 미끄러져 올라가게 한다(issue #460). iOS는 키보드 애니메이션
              // 중 visualViewport 이벤트를 연속으로 쏘지 않는 구간이 있어, 트랜지션이 없으면
              // 최종값이 한 프레임에 반영돼 튀어 오른다.
              //
              // duration만 앱 기준값(300ms)이 아니라 키보드 전용 250ms를 쓴다 — iOS 키보드
              // 애니메이션에 프레임을 맞추기 위한 의도적 예외다(근거는 globals.css의
              // `--motion-duration-keyboard`). 커브는 아래 Popup의 진입·퇴장과 같은 ease-base다.
              "transition-[padding-bottom] duration-[var(--motion-duration-keyboard)] ease-base motion-reduce:transition-none",
              viewportClassName
            )}
          >
            <DrawerPrimitive.Popup
              data-slot="bottom-sheet-popup"
              className={cn(
                "flex w-full max-w-[345px] flex-col items-center gap-4 rounded-3xl bg-white px-4 pt-6 pb-5 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-base ease-base data-ending-style:translate-y-[calc(100%_+_2rem)] data-starting-style:translate-y-[calc(100%_+_2rem)]",
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
