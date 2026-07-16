"use client"

import * as React from "react"
import Image from "next/image"

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
        "flex h-[3.375rem] items-center gap-2 rounded-2xl border p-4 text-body-regular-16 transition-colors",
        selected ? "border-primary text-gray-900" : "border-gray-100 text-gray-400",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-primary bg-primary" : "border-gray-200"
        )}
      >
        {selected && (
          <Image
            src="/icons/common/check.svg"
            alt=""
            width={14}
            height={14}
            className="size-3.5"
          />
        )}
      </span>
      {label}
    </button>
  )
}

export { ChoicePill }
