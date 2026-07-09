import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface ClearButtonProps extends React.ComponentProps<"button"> {
  inputRef: React.RefObject<HTMLInputElement | null>
}

function ClearButton({ className, inputRef, ...props }: ClearButtonProps) {
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
    <button
      type="button"
      data-slot="clear-button"
      aria-label="지우기"
      onClick={handleClear}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full bg-gray-400",
        className
      )}
      {...props}
    >
      <Image src="/icons/common/clear.svg" alt="" width={8} height={8} className="size-2" />
    </button>
  )
}

export { ClearButton }
