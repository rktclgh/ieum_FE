"use client"

import * as React from "react"
import Image from "next/image"

import { Circle } from "@/components/ui/circle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

/**
 * 홈 지도 우하단 FAB. `+`↔`×` 토글로 "모임 만들기 / 질문하기" 컨텍스트 메뉴를 펼친다.
 * 펼쳐진 동안 화면 전체를 덮는 딤 배경으로 바깥 클릭 시 닫는다.
 */
interface MapFabProps {
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  className?: string
}

function MapFab({ onCreateMeetup, onCreateQuestion, className }: MapFabProps) {
  const { messages } = useTranslation()
  const [open, setOpen] = React.useState(false)

  const close = () => setOpen(false)

  // 열려 있을 때만 리스너를 걸어 Escape로 닫는다 — ChatContextMenu와 같은 패턴.
  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <>
      {/*
       * 백드롭·메뉴 모두 항상 마운트해 두고 opacity/scale만 토글한다 (issue #280).
       * 조건부 렌더로는 퇴장 애니메이션이 불가능해 메뉴가 툭 사라진다.
       */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 cursor-default bg-black/10 transition-opacity duration-base ease-base",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div className={cn("relative z-50", className)}>
        <div
          // 숨김 상태에서 키보드 포커스·스크린리더에 노출되지 않도록 inert 처리
          inert={!open}
          className={cn(
            "absolute right-0 bottom-[calc(100%_+_8px)] flex w-[180px] origin-bottom-right flex-col gap-1 rounded-3xl bg-white/80 px-6 py-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur transition-[opacity,scale] duration-base ease-base",
            open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          )}
        >
          <button
            type="button"
            onClick={() => {
              onCreateMeetup?.()
              close()
            }}
            className="flex items-center gap-2 py-2"
          >
            <Image src="/icons/map/group.svg" alt="" width={24} height={24} className="size-6" />
            <span className="text-body-medium-15 text-gray-900">{messages.home.createMeetupAction}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onCreateQuestion?.()
              close()
            }}
            className="flex items-center gap-2 py-2"
          >
            <Image src="/icons/map/question.svg" alt="" width={24} height={24} className="size-6" />
            <span className="text-body-medium-15 text-gray-900">{messages.home.createQuestionAction}</span>
          </button>
        </div>

        <Circle
          background="primary"
          iconSrc="/icons/circle/plus-white.svg"
          iconClassName={cn("transition-transform duration-base ease-base", open && "rotate-45")}
          aria-label={open ? messages.home.createMenuCloseLabel : messages.home.createMenuOpenLabel}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        />
      </div>
    </>
  )
}

export { MapFab }
