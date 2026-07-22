"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"
import { Icon } from "@/components/ui/icon"

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
  ref,
  ...props
}: SearchBoxProps) {
  // 내부 inputRef는 ClearButton이 쓰므로 항상 살아 있어야 한다.
  // 호출부가 넘긴 ref는 여기에 덧붙여 채운다(스프레드로 덮어쓰면 ClearButton이 깨진다).
  const inputRef = React.useRef<HTMLInputElement>(null)
  const attachRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
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
      <Icon name="search-bar/search" width={20} height={20} className="size-5 shrink-0" />
      <input
        ref={attachRef}
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
          "w-full bg-transparent text-body-regular-15 caret-gray-900 outline-none placeholder:text-body-regular-15 placeholder:text-gray-400",
          hasValue ? "text-body-medium-15 text-gray-900" : "text-gray-400"
        )}
        {...props}
      />
      {hasValue && <ClearButton inputRef={inputRef} />}
    </div>
  )
}

export { SearchBox }
