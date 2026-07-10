"use client"

import { Info } from "lucide-react"
import * as React from "react"

import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapAttributionProps {
  className?: string
}

// CARTO 무료 타일 + OSM(ODbL) 약관상 저작권 표기는 의무 사항이라 제거하지 않고
// 좌하단 ⓘ 버튼으로 접어 화면을 가리지 않게 처리한다.
function MapAttribution({ className }: MapAttributionProps) {
  const { messages } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={messages.home.attributionButtonLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm backdrop-blur"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <div className="rounded-md bg-white/90 px-2 py-1 text-[10px] leading-tight text-gray-600 shadow-sm backdrop-blur">
          &copy;{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>{" "}
          contributors &copy;{" "}
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            CARTO
          </a>
        </div>
      )}
    </div>
  )
}

export { MapAttribution }
