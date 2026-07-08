"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5
const PADDING_COUNT = Math.floor(VISIBLE_COUNT / 2)
const SETTLE_DELAY_MS = 120

interface WheelPickerProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  options: string[]
  value: string
  onChange: (value: string) => void
}

function WheelPicker({ className, options, value, onChange, ...props }: WheelPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const settleTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const isSyncingRef = React.useRef(false)
  const selectedIndex = Math.max(options.indexOf(value), 0)
  const [centerIndex, setCenterIndex] = React.useState(selectedIndex)

  React.useEffect(() => {
    const index = Math.max(options.indexOf(value), 0)
    setCenterIndex(index)
    isSyncingRef.current = true
    containerRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: "auto" })
    const frame = requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [value, options])

  React.useEffect(() => () => clearTimeout(settleTimeoutRef.current), [])

  const handleScroll = () => {
    if (isSyncingRef.current || options.length === 0) return

    const top = containerRef.current?.scrollTop ?? 0
    const index = Math.min(Math.max(Math.round(top / ITEM_HEIGHT), 0), options.length - 1)
    setCenterIndex(index)

    clearTimeout(settleTimeoutRef.current)
    settleTimeoutRef.current = setTimeout(() => {
      if (options[index] !== value) onChange(options[index])
    }, SETTLE_DELAY_MS)
  }

  const handleItemClick = (index: number) => {
    containerRef.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" })
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-slot="wheel-picker"
      className={cn(
        "h-[200px] snap-y snap-mandatory overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    >
      <div style={{ height: PADDING_COUNT * ITEM_HEIGHT }} aria-hidden />
      {options.map((option, index) => {
        const distance = Math.abs(index - centerIndex)
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleItemClick(index)}
            style={{ height: ITEM_HEIGHT }}
            className={cn(
              "flex w-full shrink-0 snap-center items-center justify-center transition-opacity duration-150",
              distance === 0
                ? "text-title-semibold-20 text-gray-900 opacity-100"
                : distance === 1
                  ? "text-body-medium-16 text-gray-600 opacity-60"
                  : "text-body-medium-16 text-gray-600 opacity-35"
            )}
          >
            {option}
          </button>
        )
      })}
      <div style={{ height: PADDING_COUNT * ITEM_HEIGHT }} aria-hidden />
    </div>
  )
}

export { WheelPicker }
