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

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={close}
          className="fixed inset-0 z-40 cursor-default bg-black/10"
        />
      ) : null}

      <div className={cn("relative z-50", className)}>
        {open ? (
          <div className="absolute right-0 bottom-[calc(100%_+_8px)] flex w-[180px] flex-col gap-1 rounded-3xl bg-white/80 px-6 py-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur">
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
        ) : null}

        <Circle
          background="primary"
          iconSrc={open ? "/icons/circle/close-white.svg" : "/icons/circle/plus-white.svg"}
          aria-label={open ? messages.home.createMenuCloseLabel : messages.home.createMenuOpenLabel}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        />
      </div>
    </>
  )
}

export { MapFab }
