"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ClearButton } from "@/components/ui/clear-button"

interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
  endAdornment?: React.ReactNode
}

function Input({
  className,
  defaultValue,
  value,
  error,
  endAdornment,
  onChange,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const [uncontrolledHasValue, setUncontrolledHasValue] = React.useState(Boolean(defaultValue))
  const hasValue = isControlled ? String(value).length > 0 : uncontrolledHasValue

  return (
    <div
      data-slot="input-wrapper"
      className={cn(
        "flex h-[3.375rem] w-full items-center gap-2 rounded-2xl border border-gray-100 p-4 transition-colors focus-within:border-primary-600 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        error && "border-red focus-within:border-red",
        className
      )}
    >
      <input
        ref={inputRef}
        data-slot="input"
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          if (!isControlled) setUncontrolledHasValue(event.target.value.length > 0)
          onChange?.(event)
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full bg-transparent text-body-medium-16 text-gray-900 caret-primary-600 outline-none placeholder:text-body-regular-16 placeholder:text-gray-400"
        {...props}
      />
      {endAdornment ?? (hasValue && <ClearButton inputRef={inputRef} />)}
    </div>
  )
}

export { Input }
