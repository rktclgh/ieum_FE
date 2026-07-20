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
  /**
   * 값만 받는 변경 콜백. maxLength가 있으면 그 길이로 잘라서 넘긴다.
   *
   * 브라우저 maxLength는 한글(IME) 조합 중에는 걸리지 않아 상한을 넘긴 글자가 새어 들어오는데,
   * 그 방어를 호출부마다 `value.slice(0, max)`로 반복하지 않도록 여기로 모았다.
   * DOM 값을 직접 고치면 React가 커밋 때 해주는 커서 위치 복원이 깨져 편집 중 커서가 맨 뒤로
   * 튀므로, 자른 값은 상태 갱신 경로로만 흘려보낸다.
   */
  onValueChange?: (value: string) => void
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
  onValueChange,
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
          const next = event.target.value
          if (!isControlled) setUncontrolledLength(Math.min(next.length, maxLength ?? next.length))
          onChange?.(event)
          onValueChange?.(maxLength != null ? next.slice(0, maxLength) : next)
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
