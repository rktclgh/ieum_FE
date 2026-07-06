"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  error?: boolean
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
        <button
          type="button"
          data-slot="password-toggle"
          aria-label={isRevealed ? "비밀번호 숨기기" : "비밀번호 표시"}
          onClick={() => setIsRevealed((prev) => !prev)}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image
            src="/icons/common/password.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
        </button>
      )}
      {hasValue && <ClearButton inputRef={inputRef} />}
    </div>
  )
}

export { PasswordInput }
