import * as React from "react"

import { cn } from "@/lib/utils"

interface SectionTitleProps extends React.ComponentProps<"div"> {
  title: string
  count?: number | string
  /** Figma "Title" 컴포넌트의 explanation variant: withoutPadding | withPadding12 */
  padding?: "none" | "12"
}

function SectionTitle({ className, title, count, padding = "none", ...props }: SectionTitleProps) {
  return (
    <div
      data-slot="section-title"
      className={cn(
        "flex h-7 items-center gap-1 py-1",
        padding === "12" && "px-3",
        className
      )}
      {...props}
    >
      <p className="text-body-medium-14 text-gray-900">{title}</p>
      {count !== undefined && <p className="text-body-semibold-15 text-primary">{count}</p>}
    </div>
  )
}

export { SectionTitle }
