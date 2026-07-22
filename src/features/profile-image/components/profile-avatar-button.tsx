"use client"

import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { NoImageProfile } from "@/components/ui/no-image"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface ProfileAvatarButtonProps {
  previewUrl: string | null
  onFileSelected: (file: File) => void
  className?: string
}

// Figma: 원형 아바타 + 우하단 카메라 배지. 탭 → OS 파일 선택 시트(사진 보관함/사진 찍기).
function ProfileAvatarButton({ previewUrl, onFileSelected, className }: ProfileAvatarButtonProps) {
  const { messages } = useTranslation()
  const t = messages.profileImage
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = "" // 같은 파일 재선택 허용
    if (file) onFileSelected(file)
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className="relative size-24">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <NoImageProfile className="size-24 rounded-full" />
        )}
        <button
          type="button"
          aria-label={t.editLabel}
          onClick={() => fileInputRef.current?.click()}
          className="absolute right-0 bottom-0 flex aspect-square size-8 items-center justify-center rounded-full border-[3px] border-white bg-gray-400"
        >
          <Icon name="chat/camera-line" width={16} height={16} className="size-4 invert" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

export { ProfileAvatarButton }
