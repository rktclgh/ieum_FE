"use client"

import { Circle } from "@/components/ui/circle"
import { MapFab } from "@/features/map/components/map-fab"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapControlsProps {
  onRecenter: () => void
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  onListView?: () => void
  className?: string
}

function MapControls({
  onRecenter,
  onCreateMeetup,
  onCreateQuestion,
  onListView,
  className,
}: MapControlsProps) {
  const { messages } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Circle
        iconSrc="/icons/circle/location.svg"
        aria-label={messages.home.locateMeLabel}
        onClick={onRecenter}
      />
      <Circle
        iconSrc="/icons/circle/list.svg"
        aria-label={messages.home.listViewLabel}
        onClick={onListView}
      />
      <MapFab onCreateMeetup={onCreateMeetup} onCreateQuestion={onCreateQuestion} />
    </div>
  )
}

export { MapControls }
