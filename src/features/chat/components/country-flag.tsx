import * as React from "react"

import { FlagIcon, useFlagSprite } from "@/components/ui/flag-icon"
import type { CountryCode } from "@/lib/constants/countries"
import { cn } from "@/lib/utils"

interface CountryFlagProps extends React.ComponentProps<"div"> {
  code: CountryCode
  country: string
}

// 스프라이트가 준비되기 전엔 통째로 invisible(공간은 유지) 처리해, 국가명 텍스트가 국기보다
// 먼저 보이지 않고 스프라이트 도착과 동시에 국가명+국기가 함께 나타나게 한다.
function CountryFlag({ className, code, country, ...props }: CountryFlagProps) {
  const ready = useFlagSprite()

  return (
    <div
      data-slot="country-flag"
      className={cn("flex items-center justify-center gap-1", !ready && "invisible", className)}
      {...props}
    >
      <FlagIcon code={code} className="h-4 w-[22px]" />
      <span className="text-body-regular-14 text-gray-400">{country}</span>
    </div>
  )
}

export { CountryFlag }
