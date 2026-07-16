import * as React from "react"
import Image from "next/image"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const circleVariants = cva("inline-flex size-[46px] shrink-0 items-center justify-center rounded-full", {
  variants: {
    background: {
      white: "bg-white",
      primary: "bg-primary",
    },
    tone: {
      elevated: "shadow-[0px_2px_2px_0px_rgba(0,0,0,0.10)] outline outline-1 -outline-offset-1 outline-gray-50",
      flat: "border border-gray-100",
    },
  },
  defaultVariants: {
    background: "white",
    tone: "elevated",
  },
})

interface CircleProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof circleVariants> {
  iconSrc: string
  iconAlt?: string
}

function Circle({
  className,
  background,
  tone,
  iconSrc,
  iconAlt = "",
  ...props
}: CircleProps) {
  return (
    <button
      type="button"
      data-slot="circle"
      className={cn(circleVariants({ background, tone, className }))}
      {...props}
    >
      <Image src={iconSrc} alt={iconAlt} width={24} height={24} className="size-6" />
    </button>
  )
}

export { Circle, circleVariants }
