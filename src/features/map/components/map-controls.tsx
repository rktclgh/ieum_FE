"use client"

import { Circle } from "@/components/ui/circle"
import { MapFab } from "@/features/map/components/map-fab"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MapControlsProps {
  onRecenter: () => void
  /** 지도가 내 위치에 맞춰진 상태 — 위치 아이콘을 primary 색으로 보여준다 */
  isLocateActive?: boolean
  onCreateMeetup?: () => void
  onCreateQuestion?: () => void
  onListView?: () => void
  className?: string
}

function MapControls({
  onRecenter,
  isLocateActive,
  onCreateMeetup,
  onCreateQuestion,
  onListView,
  className,
}: MapControlsProps) {
  const { messages } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Circle
        iconSrc="circle/location"
        activeIconSrc="circle/location-primary"
        active={isLocateActive}
        aria-label={messages.home.locateMeLabel}
        onClick={onRecenter}
      />
      <Circle
        iconSrc="circle/list"
        aria-label={messages.home.listViewLabel}
        onClick={onListView}
      />
      <MapFab onCreateMeetup={onCreateMeetup} onCreateQuestion={onCreateQuestion} />
    </div>
  )
}

export { MapControls }
