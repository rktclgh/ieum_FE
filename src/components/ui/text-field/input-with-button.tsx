"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface InputWithButtonProps extends React.ComponentProps<"input"> {
  error?: boolean
  buttonLabel: string
  onButtonClick?: () => void
  buttonDisabled?: boolean
}

function InputWithButton({
  className,
  defaultValue,
  value,
  error,
  buttonLabel,
  onButtonClick,
  buttonDisabled,
  onChange,
  onFocus,
  onBlur,
  ...props
}: InputWithButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [hasValue, setHasValue] = React.useState(Boolean(defaultValue ?? value ?? ""))
  const [isFocused, setIsFocused] = React.useState(false)
  const isButtonActive = buttonDisabled === undefined ? isFocused : !buttonDisabled

  return (
    <div
      data-slot="input-with-button-wrapper"
      className={cn(
        "flex h-[3.375rem] w-full items-center justify-between gap-2 rounded-2xl border border-gray-100 py-4 pr-2 pl-4 transition-colors focus-within:border-primary-600 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        error && "border-red focus-within:border-red",
        className
      )}
    >
      <input
        ref={inputRef}
        data-slot="input-with-button"
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
        className="w-full min-w-0 bg-transparent text-body-medium-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
        {...props}
      />
      <div className="flex shrink-0 items-center gap-2">
        {hasValue && <ClearButton inputRef={inputRef} />}
        <button
          type="button"
          data-slot="input-button"
          disabled={!isButtonActive}
          onClick={onButtonClick}
          className={cn(
            "rounded-lg px-3 py-2.5 text-body-regular-13 text-white transition-colors",
            isButtonActive ? "bg-primary-600" : "bg-gray-200"
          )}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

export { InputWithButton }
