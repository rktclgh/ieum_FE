"use client"

import { Circle } from "@/components/ui/circle"
import { MapFab } from "@/features/map/components/map-fab"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapControlsProps {
  onToggleFollow: () => void
  isFollowing?: boolean
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  className?: string
}

function MapControls({
  onToggleFollow,
  isFollowing = false,
  onCreateMeetup,
  onCreateQuestion,
  className,
}: MapControlsProps) {
  const { messages } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Circle
        iconSrc="/icons/circle/location.svg"
        aria-label={messages.home.locateMeLabel}
        aria-pressed={isFollowing}
        className={isFollowing ? "outline-2 outline-primary-600" : undefined}
        onClick={onToggleFollow}
      />
      <Circle iconSrc="/icons/circle/list.svg" aria-label={messages.home.listViewLabel} />
      <MapFab onCreateMeetup={onCreateMeetup} onCreateQuestion={onCreateQuestion} />
    </div>
  )
}

export { MapControls }
