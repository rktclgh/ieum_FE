"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
  endAdornment?: React.ReactNode
  /**
   * 포커스 중에만 오른쪽에 `(현재/최대)` 글자수를 보여준다(maxLength가 있을 때만).
   * 포커스가 없으면 평소처럼 지우기 버튼이 나온다.
   */
  showCounter?: boolean
}

function Input({
  className,
  defaultValue,
  value,
  error,
  endAdornment,
  showCounter,
  disabled,
  maxLength,
  onChange,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const [uncontrolledLength, setUncontrolledLength] = React.useState(String(defaultValue ?? "").length)
  const [focused, setFocused] = React.useState(false)
  const length = isControlled ? String(value).length : uncontrolledLength
  const counterVisible = showCounter && maxLength != null && focused

  return (
    <div
      data-slot="input-wrapper"
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-2 rounded-2xl border border-gray-100 p-4 transition focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        error && "border-red focus-within:border-red focus-within:ring-red",
        className
      )}
    >
      <input
        ref={inputRef}
        data-slot="input"
        disabled={disabled}
        defaultValue={defaultValue}
        value={value}
        maxLength={maxLength}
        onChange={(event) => {
          // 브라우저 maxLength는 한글(IME) 조합 중에는 걸리지 않아 상한을 넘긴 글자가 새어 들어온다.
          // 호출부마다 slice하지 않아도 되도록 여기서 잘라 넘긴다.
          if (maxLength != null && event.target.value.length > maxLength) {
            event.target.value = event.target.value.slice(0, maxLength)
          }
          if (!isControlled) setUncontrolledLength(event.target.value.length)
          onChange?.(event)
        }}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        className="w-full bg-transparent text-body-medium-16 text-gray-900 caret-primary outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
        {...props}
      />
      {counterVisible ? (
        <span className="shrink-0 text-body-regular-14 text-gray-400">
          ({length}/{maxLength})
        </span>
      ) : (
        endAdornment ?? (length > 0 && <ClearButton inputRef={inputRef} disabled={disabled} />)
      )}
    </div>
  )
}

export { Input }
