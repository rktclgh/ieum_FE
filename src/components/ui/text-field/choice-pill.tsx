"use client"

import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface ChoicePillProps extends Omit<React.ComponentProps<"button">, "onClick"> {
  label: string
  selected: boolean
  onClick?: () => void
}

function ChoicePill({ className, label, selected, onClick, ...props }: ChoicePillProps) {
  return (
    <button
      type="button"
      data-slot="choice-pill"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-[3.375rem] items-center gap-2 rounded-2xl border border-gray-100 p-4 text-body-regular-16 transition-colors",
        selected ? "text-gray-900" : "text-gray-400",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-gray-900 bg-gray-900" : "border-gray-200 bg-transparent"
        )}
      >
        {selected && <Icon name="common/check" width={14} height={14} className="size-3.5" />}
      </span>
      {label}
    </button>
  )
}

export { ChoicePill }
