"use client"

import { Icon } from "@/components/ui/icon"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MeetupImagePickerProps {
  image: string | null
  onPick: () => void
  onRemove: () => void
  className?: string
}

/**
 * 모임 대표 사진 첨부. 빈 상태에서는 카메라 버튼을 탭하면 OS 파일 선택 시트가 바로 열리고,
 * 첨부 후에는 64px 썸네일 + 우상단 삭제 배지로 바뀐다.
 */
function MeetupImagePicker({ image, onPick, onRemove, className }: MeetupImagePickerProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup

  if (image) {
    return (
      <div className={cn("relative size-16", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={t.imageAlt} className="size-16 rounded-xl object-cover" />
        <button
          type="button"
          aria-label={t.removeImageLabel}
          onClick={onRemove}
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-black/50"
        >
          <Icon name="circle/close-white" width={10} height={10} className="size-2.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex size-16 flex-col items-center justify-center rounded-xl border border-gray-100",
        className
      )}
    >
      <Icon name="write/photo" width={20} height={20} className="size-5" />
      <span className="text-body-regular-12 text-gray-400">{t.imagePickerLabel}</span>
    </button>
  )
}

export { MeetupImagePicker }
