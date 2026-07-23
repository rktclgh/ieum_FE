import * as React from "react"

import { FlagIcon } from "@/components/ui/flag-icon"
import type { CountryCode } from "@/lib/constants/countries"
import { cn } from "@/lib/utils"

interface CountryFlagProps extends React.ComponentProps<"div"> {
  code: CountryCode
  country: string
}

function CountryFlag({ className, code, country, ...props }: CountryFlagProps) {
  return (
    <div
      data-slot="country-flag"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <FlagIcon code={code} className="h-4 w-[22px]" />
      <span className="text-body-regular-14 text-gray-400">{country}</span>
    </div>
  )
}

export { CountryFlag }
