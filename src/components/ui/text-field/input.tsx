import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-[3.375rem] w-full rounded-2xl border border-gray-100 p-4 text-body-medium-16 text-gray-900 caret-primary-600 outline-none transition-colors placeholder:text-body-regular-16 placeholder:text-gray-400 focus-visible:border-primary-600 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
