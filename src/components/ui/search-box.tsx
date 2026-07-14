"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface SearchBoxProps extends React.ComponentProps<"input"> {
  /** flat: 그림자·아웃라인 없이 Gray-50 배경으로 고정 (채팅목록 · 친구목록) */
  tone?: "elevated" | "flat"
}

function SearchBox({
  className,
  defaultValue,
  value,
  onChange,
  onFocus,
  onBlur,
  tone = "elevated",
  ...props
}: SearchBoxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const [uncontrolledHasValue, setUncontrolledHasValue] = React.useState(Boolean(defaultValue ?? ""))
  const hasValue = isControlled ? String(value ?? "").length > 0 : uncontrolledHasValue
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <div
      data-slot="search-box"
      className={cn(
        "flex h-[45px] w-full items-center gap-3 rounded-full px-4 py-3 transition-colors",
        tone === "elevated"
          ? cn("shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50", hasValue || isFocused ? "bg-gray-50" : "bg-white")
          : "bg-gray-50",
        className
      )}
    >
      <Image src="/icons/search-bar/search.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          if (!isControlled) setUncontrolledHasValue(event.target.value.length > 0)
          onChange?.(event)
        }}
        onFocus={(event) => {
          setIsFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          onBlur?.(event)
        }}
        className={cn(
          "w-full bg-transparent text-body-regular-15 caret-primary-400 outline-none placeholder:text-body-regular-15 placeholder:text-gray-400",
          hasValue ? "text-body-medium-15 text-gray-900" : "text-gray-400"
        )}
        {...props}
      />
      {hasValue && <ClearButton inputRef={inputRef} />}
    </div>
  )
}

export { SearchBox }
