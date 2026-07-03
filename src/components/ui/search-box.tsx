"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

function SearchBox({
  className,
  defaultValue,
  value,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = React.useState(Boolean(defaultValue ?? value ?? ""))

  const handleClear = () => {
    const input = inputRef.current
    if (!input) return

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set
    nativeSetter?.call(input, "")
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.focus()
  }

  return (
    <div
      data-slot="search-box"
      className={cn(
        "flex h-[45px] w-full items-center gap-3 rounded-full bg-white px-4 py-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50",
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
        className={cn(
          "w-full bg-transparent text-body-regular-15 outline-none placeholder:text-body-regular-15 placeholder:text-gray-400",
          hasValue ? "text-body-medium-15 text-gray-900" : "text-gray-400"
        )}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          aria-label="지우기"
          onClick={handleClear}
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-400"
        >
          <Image src="/icons/search-bar/clear.svg" alt="" width={12} height={12} />
        </button>
      )}
    </div>
  )
}

export { SearchBox }
