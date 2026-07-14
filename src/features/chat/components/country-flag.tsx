import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface CountryFlagProps extends React.ComponentProps<"div"> {
  flagSrc: string
  country: string
}

function CountryFlag({ className, flagSrc, country, ...props }: CountryFlagProps) {
  return (
    <div
      data-slot="country-flag"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <div className="relative h-4 w-[22px] shrink-0 overflow-hidden rounded-[3px] border border-gray-100">
        <Image src={flagSrc} alt="" fill className="object-cover" />
      </div>
      <span className="text-body-regular-14 text-gray-400">{country}</span>
    </div>
  )
}

export { CountryFlag }
