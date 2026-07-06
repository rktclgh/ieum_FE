import * as React from "react"

import { cn } from "@/lib/utils"

interface FieldLabelProps extends React.ComponentProps<"div"> {
  text: string
}

function FieldLabel({ className, text, ...props }: FieldLabelProps) {
  return (
    <div
      data-slot="field-label"
      className={cn("flex w-full items-center px-2 py-1", className)}
      {...props}
    >
      <p className="text-body-medium-14 text-gray-900">{text}</p>
    </div>
  )
}

export { FieldLabel }
