"use client"

import * as React from "react"
import Image from "next/image"
import { Globe } from "lucide-react"

import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { useLongPress } from "@/lib/hooks/use-long-press"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface NoticeBannerProps extends React.ComponentProps<"div"> {
  text: string
  isAuthenticated?: boolean
  onClose?: () => void
}

function NoticeBanner({ className, text, isAuthenticated = false, onClose, ...props }: NoticeBannerProps) {
  const { messages } = useTranslation()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const translate = useTranslateToggle({ text, isAuthenticated })
  const longPress = useLongPress({
    onLongPress: () => {
      if (translate.canTranslate) setMenuOpen(true)
    },
  })

  const translateMenuItem: ChatContextMenuItem = {
    icon: <Globe className="size-6 text-gray-900" />,
    label: translate.isLoading
      ? messages.translate.translatingLabel
      : translate.isShowingTranslation
        ? messages.translate.viewOriginalLabel
        : messages.translate.menuLabel,
    onClick: () => {
      translate.toggle()
      setMenuOpen(false)
    },
  }

  return (
    <div className="relative">
      <div
        data-slot="notice-banner"
        className={cn(
          "flex items-center justify-between rounded-xl bg-gray-50 p-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.1)]",
          LONG_PRESS_TRANSITION,
          // 배너는 롱프레스 대상이 안쪽 텍스트 영역이지만 리프트는 카드 전체가 받아야 자연스럽다.
          menuOpen ? LONG_PRESS_SURFACE_ACTIVE : LONG_PRESS_INACTIVE,
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2" {...(translate.canTranslate ? longPress : {})}>
          <Image src="/icons/chat/notification.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
          <p className="min-w-0 break-words text-body-regular-14 text-gray-900">{translate.displayText}</p>
        </div>
        <button
          type="button"
          aria-label={messages.common.close}
          onClick={onClose}
          className="flex size-4 shrink-0 items-center justify-center"
        >
          <Image src="/icons/app-bar/close.svg" alt="" width={16} height={16} className="size-4" />
        </button>
      </div>
      {translate.isError ? (
        <p className="mt-1 px-3 text-body-regular-12 text-red">{messages.translate.translateFailedLabel}</p>
      ) : null}
      {menuOpen && translate.canTranslate ? (
        <ChatContextMenu
          items={[translateMenuItem]}
          dimmed
          onDismiss={() => setMenuOpen(false)}
          className="top-full left-0 mt-3"
        />
      ) : null}
    </div>
  )
}

export { NoticeBanner }
