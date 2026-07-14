import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const titleVariants = cva("flex w-full items-center gap-1 py-1", {
  variants: {
    variant: {
      default: "px-2",
      withoutPadding: "",
      withPadding: "px-4",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface TitleProps extends React.ComponentProps<"div">, VariantProps<typeof titleVariants> {
  text: string
  num?: string
}

function Title({ className, text, variant, num, ...props }: TitleProps) {
  return (
    <div data-slot="title" className={cn(titleVariants({ variant }), className)} {...props}>
      <p className="text-body-medium-14 text-gray-900">{text}</p>
      {variant !== "default" && num && (
        <p className="text-body-semibold-15 text-primary-400">{num}</p>
      )}
    </div>
  )
}

export { Title, titleVariants }
export type { TitleProps }
