"use client"

import * as React from "react"
import Image from "next/image"

import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface MeetupImagePickerProps {
  image: string | null
  onTakePhoto: () => void
  onChooseAlbum: () => void
  onRemove: () => void
  className?: string
}

/**
 * 모임 대표 사진 첨부. 빈 상태에서는 카메라 버튼을 탭하면 "사진 찍기 / 앨범에서 고르기" 메뉴가 위로 펼쳐지고,
 * 첨부 후에는 64px 썸네일 + 우상단 삭제 배지로 바뀐다.
 */
function MeetupImagePicker({ image, onTakePhoto, onChooseAlbum, onRemove, className }: MeetupImagePickerProps) {
  const { messages } = useTranslation()
  const t = messages.createMeetup
  const [menuOpen, setMenuOpen] = React.useState(false)

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
          <Image src="/icons/circle/close-white.svg" alt="" width={10} height={10} className="size-2.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {menuOpen ? (
        <ChatContextMenu
          dimmed
          onDismiss={() => setMenuOpen(false)}
          className="bottom-[calc(100%+8px)] left-0"
          items={[
            {
              icon: <Image src="/icons/chat/camera-line.svg" alt="" width={24} height={24} />,
              label: t.takePhotoAction,
              onClick: () => {
                setMenuOpen(false)
                onTakePhoto()
              },
            },
            {
              icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />,
              label: t.chooseAlbumAction,
              onClick: () => {
                setMenuOpen(false)
                onChooseAlbum()
              },
            },
          ]}
        />
      ) : null}

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="flex size-16 flex-col items-center justify-center rounded-xl border border-gray-100"
      >
        <Image src="/icons/write/photo.svg" alt="" width={20} height={20} className="size-5" />
        <span className="text-body-regular-12 text-gray-400">{t.imagePickerLabel}</span>
      </button>
    </div>
  )
}

export { MeetupImagePicker }
