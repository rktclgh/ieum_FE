import * as React from "react"

import { cn } from "@/lib/utils"

interface ChatDateDividerProps extends React.ComponentProps<"div"> {
  text: string
}

function ChatDateDivider({ className, text, ...props }: ChatDateDividerProps) {
  return (
    <div
      data-slot="chat-date-divider"
      className={cn("flex items-center justify-center gap-4 py-2", className)}
      {...props}
    >
      <div className="h-px flex-1 bg-gray-100" />
      <span className="shrink-0 text-body-regular-12 text-gray-400">{text}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

export { ChatDateDivider }
