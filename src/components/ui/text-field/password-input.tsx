"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  error?: boolean
}

/** 눈 모양은 고정된 채, 사선(비밀번호 숨김 표시)만 opacity로 사라졌다 나타남 */
function PasswordVisibilityIcon({ revealed }: { revealed: boolean }) {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.04803 0C4.64424 0 1.7167 1.83619 0.180616 4.82753C-0.0543326 5.28507 -0.0617635 5.82765 0.170003 6.28681C1.6058 9.13129 4.65994 11.1074 8.04803 11.1074C11.4373 11.1074 14.4501 9.11367 15.868 6.29462C16.0959 5.84147 16.0921 5.30689 15.8618 4.85499C14.4083 2.00379 11.4412 0 8.04803 0ZM8.04803 8.45802C6.31888 8.45802 4.91552 7.12015 4.91552 5.4717C4.91552 3.82324 6.31888 2.48537 8.04803 2.48537C9.77717 2.48537 11.1805 3.82324 11.1805 5.4717C11.1805 7.12015 9.77717 8.45802 8.04803 8.45802ZM8.04803 3.45567C6.87789 3.45567 5.93332 4.35616 5.93332 5.4717C5.93332 6.58723 6.87789 7.48772 8.04803 7.48772C9.21817 7.48772 10.1627 6.58723 10.1627 5.4717C10.1627 4.35616 9.21817 3.45567 8.04803 3.45567Z"
        fill="#9AA5A8"
      />
      <line
        x1="2"
        y1="1.2"
        x2="15"
        y2="10.8"
        stroke="#9AA5A8"
        strokeWidth="1.4"
        strokeLinecap="round"
        className={cn("transition-opacity duration-150", revealed ? "opacity-0" : "opacity-100")}
      />
    </svg>
  )
}

function PasswordInput({
  className,
  defaultValue,
  value,
  error,
  onChange,
  onFocus,
  onBlur,
  ...props
}: PasswordInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = React.useState(Boolean(defaultValue ?? value ?? ""))
  const [isRevealed, setIsRevealed] = React.useState(false)

  return (
    <div
      data-slot="password-input-wrapper"
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-2 rounded-2xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        error && "border-red focus-within:border-red",
        className
      )}
    >
      <input
        ref={inputRef}
        data-slot="password-input"
        type={isRevealed ? "text" : "password"}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          setHasValue(event.target.value.length > 0)
          onChange?.(event)
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full bg-transparent text-body-medium-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
        {...props}
      />
      {hasValue && (
        <>
          <button
            type="button"
            data-slot="password-toggle"
            aria-label={isRevealed ? "비밀번호 숨기기" : "비밀번호 표시"}
            onClick={() => setIsRevealed((prev) => !prev)}
            className="flex size-6 shrink-0 items-center justify-center"
          >
            <PasswordVisibilityIcon revealed={isRevealed} />
          </button>
          <ClearButton inputRef={inputRef} />
        </>
      )}
    </div>
  )
}

export { PasswordInput }
