import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-body-medium-14 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] transition-colors",
  {
    variants: {
      selected: {
        true: "bg-primary-600 text-white",
        false: "bg-white text-gray-900",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
)

interface ChipProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof chipVariants> {}

function Chip({ className, selected, ...props }: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      aria-pressed={selected ?? false}
      className={cn(chipVariants({ selected, className }))}
      {...props}
    />
  )
}

export { Chip, chipVariants }
