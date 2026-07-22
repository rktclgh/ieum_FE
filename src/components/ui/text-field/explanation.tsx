import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface ExplanationProps extends React.ComponentProps<"div"> {
  variant?: "default" | "great" | "error"
  text: string
}

function Explanation({ className, variant = "default", text, ...props }: ExplanationProps) {
  const isGreat = variant === "great"
  const isError = variant === "error"

  return (
    <div
      data-slot="explanation"
      className={cn("flex w-full items-center gap-1 px-2 py-1", className)}
      {...props}
    >
      {isGreat && (
        <Icon name="explanation/green-check" width={16} height={16} className="size-4 shrink-0" />
      )}
      <p
        className={cn("text-body-regular-12", isError ? "text-red" : "text-gray-400")}
      >
        {text}
      </p>
    </div>
  )
}

export { Explanation }
