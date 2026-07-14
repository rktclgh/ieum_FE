"use client"

import * as React from "react"
import Image from "next/image"

import { ChatContextMenu } from "@/features/chat/components/chat-context-menu"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

interface ProfileAvatarButtonProps {
  previewUrl: string | null
  onFileSelected: (file: File) => void
  className?: string
}

// Figma: 원형 아바타 + 우하단 카메라 배지. 탭 → "사진 찍기 / 앨범에서 고르기" 메뉴.
function ProfileAvatarButton({ previewUrl, onFileSelected, className }: ProfileAvatarButtonProps) {
  const { messages } = useTranslation()
  const t = messages.profileImage
  const [menuOpen, setMenuOpen] = React.useState(false)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)

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
          <div className="size-24 rounded-full bg-gray-100" />
        )}
        <button
          type="button"
          aria-label={t.editLabel}
          onClick={() => setMenuOpen(true)}
          className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-gray-700"
        >
          <Image src="/icons/chat/camera-line.svg" alt="" width={16} height={16} className="size-4 invert" />
        </button>
      </div>

      {menuOpen && (
        <ChatContextMenu
          dimmed
          onDismiss={() => setMenuOpen(false)}
          className="top-[calc(100%+8px)] left-1/2 -translate-x-1/2"
          items={[
            {
              icon: <Image src="/icons/chat/camera-line.svg" alt="" width={24} height={24} />,
              label: t.takePhoto,
              onClick: () => {
                setMenuOpen(false)
                cameraInputRef.current?.click()
              },
            },
            {
              icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />,
              label: t.chooseAlbum,
              onClick: () => {
                setMenuOpen(false)
                albumInputRef.current?.click()
              },
            },
          ]}
        />
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}

export { ProfileAvatarButton }
