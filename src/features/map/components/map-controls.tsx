"use client"

import { Circle } from "@/components/ui/circle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapControlsProps {
  onLocateMe: () => void
  className?: string
}

function MapControls({ onLocateMe, className }: MapControlsProps) {
  const { messages } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Circle
        iconSrc="/icons/circle/location.svg"
        aria-label={messages.home.locateMeLabel}
        onClick={onLocateMe}
      />
      <Circle iconSrc="/icons/circle/list.svg" aria-label={messages.home.listViewLabel} />
      <Circle
        background="primary"
        iconSrc="/icons/circle/plus-white.svg"
        aria-label={messages.home.createLabel}
      />
    </div>
  )
}

export { MapControls }
