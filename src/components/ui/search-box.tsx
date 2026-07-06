"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

function SearchBox({
  className,
  defaultValue,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<"input">) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = React.useState(Boolean(defaultValue ?? value ?? ""))
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <div
      data-slot="search-box"
      className={cn(
        "flex h-[45px] w-full items-center gap-3 rounded-full px-4 py-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50 transition-colors",
        hasValue || isFocused ? "bg-gray-50" : "bg-white",
        className
      )}
    >
      <Image src="/icons/search-bar/search.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          setHasValue(event.target.value.length > 0)
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
          "w-full bg-transparent text-body-regular-15 caret-primary-600 outline-none placeholder:text-body-regular-15 placeholder:text-gray-400",
          hasValue ? "text-body-medium-15 text-gray-900" : "text-gray-400"
        )}
        {...props}
      />
      {hasValue && <ClearButton inputRef={inputRef} />}
    </div>
  )
}

export { SearchBox }
