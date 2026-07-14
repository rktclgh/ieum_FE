import * as React from "react"

import { cn } from "@/lib/utils"

interface ChatScrollDateBadgeProps extends React.ComponentProps<"div"> {
  text: string
}

function ChatScrollDateBadge({ className, text, ...props }: ChatScrollDateBadgeProps) {
  return (
    <div
      data-slot="chat-scroll-date-badge"
      className={cn(
        "inline-flex h-6 items-center justify-center gap-2.5 rounded-full bg-black/20 px-3 py-1",
        className
      )}
      {...props}
    >
      <span className="text-body-regular-12 text-white">{text}</span>
    </div>
  )
}

export { ChatScrollDateBadge }
