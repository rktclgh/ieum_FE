"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { FullScreenOverlay } from "@/components/ui/full-screen-overlay"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { NoticeListItem } from "@/features/chat/components/notice-list-item"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useMe } from "@/features/session/hooks/use-me"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useTranslation } from "@/lib/i18n/use-translation"
import { MOCK_NOTICES } from "@/features/chat/constants/mock-data"
import { cn } from "@/lib/utils"
import { Globe } from "lucide-react"

type Notice = (typeof MOCK_NOTICES)[number]

const NOTICE_BOTTOM_SAFE_AREA = 96

interface NoticeRowProps {
  notice: Notice
  isAuthenticated: boolean
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function NoticeRow({ notice, isAuthenticated, menuOpen, menuItems, onOpenMenu, onCloseMenu }: NoticeRowProps) {
  const { messages } = useTranslation()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const translate = useTranslateToggle({ text: notice.title, isAuthenticated })

  const translateMenuItem: ChatContextMenuItem = {
    icon: <Globe className="size-6 text-gray-900" />,
    label: translate.isLoading
      ? messages.translate.translatingLabel
      : translate.isShowingTranslation
        ? messages.translate.viewOriginalLabel
        : messages.translate.menuLabel,
    onClick: () => {
      translate.toggle()
      onCloseMenu()
    },
  }

  const fullMenuItems = translate.canTranslate ? [translateMenuItem, ...menuItems] : menuItems

  // 목록 하단 행에서 메뉴가 화면 밖으로 잘리지 않도록 여유 공간을 보고 위/아래를 고른다.
  // 번역 항목이 조건부라 높이가 변하므로 실제 항목 수로 계산한다.
  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(
        spaceBelow < contextMenuHeight(fullMenuItems.length) + NOTICE_BOTTOM_SAFE_AREA ? "top" : "bottom"
      )
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative" {...longPress}>
      <NoticeListItem
        title={translate.displayText}
        authorName={notice.authorName}
        authorAvatarSrc={notice.authorAvatarSrc}
        time={notice.time}
        pinned={notice.pinned}
        active={menuOpen}
      />
      {translate.isError ? (
        <p className="ml-[52px] -mt-1 pb-2 text-body-regular-12 text-red">
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {menuOpen && (
        <ChatContextMenu
          items={fullMenuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            // Figma 1951:27443 — 제목이 아니라 카드 좌측(컨테이너 px-4 = 16px)에 맞춘다.
            "left-0",
            placement === "top" ? "bottom-full mb-5" : "top-full mt-3"
          )}
        />
      )}
    </div>
  )
}

function NoticePageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const me = useMe()
  const isAuthenticated = Boolean(me.data?.userId)

  const [notices, setNotices] = React.useState<Notice[]>(MOCK_NOTICES)
  const [activeNoticeId, setActiveNoticeId] = React.useState<string | null>(null)

  // 채팅방 공지로 고정된 항목을 최상단에, 나머지는 최신 등록 순으로 정렬
  const sortedNotices = React.useMemo(
    () =>
      [...notices].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.registeredAt - a.registeredAt
      }),
    [notices]
  )

  // 대상 공지만 고정하고 기존 고정 공지는 해제한다(동시에 한 개만 고정 → 교체)
  const pinNotice = (id: string) => {
    setNotices((prev) => prev.map((notice) => ({ ...notice, pinned: notice.id === id })))
    setActiveNoticeId(null)
  }

  const unpinNotice = (id: string) => {
    setNotices((prev) => prev.map((notice) => (notice.id === id ? { ...notice, pinned: false } : notice)))
    setActiveNoticeId(null)
  }

  const menuItemsFor = (notice: Notice): ChatContextMenuItem[] =>
    notice.pinned
      ? [
          {
            icon: <Image src="/icons/chat/pin-off.svg" alt="" width={24} height={24} />,
            label: messages.chat.unsetChatNoticeAction,
            onClick: () => unpinNotice(notice.id),
          },
        ]
      : [
          {
            icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />,
            label: messages.chat.setChatNoticeAction,
            onClick: () => pinNotice(notice.id),
          },
        ]

  return (
    // 라우트 화면이라 항상 열려 있다 — 마운트 시 아래에서 올라오는 진입 모션만 쓴다.
    <FullScreenOverlay open className="app-column flex flex-col overflow-hidden bg-white">
      <AppBar
        title={messages.chat.noticeLabel}
        trailingVariant="close"
        onLeadingClick={() => router.back()}
        onTrailingClick={() => router.back()}
        className="shrink-0"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {sortedNotices.length === 0 ? (
          <p className="py-16 text-center text-body-regular-14 text-gray-400">{messages.chat.noticeEmptyLabel}</p>
        ) : (
          sortedNotices.map((notice) => (
            <NoticeRow
              key={notice.id}
              notice={notice}
              isAuthenticated={isAuthenticated}
              menuOpen={activeNoticeId === notice.id}
              menuItems={menuItemsFor(notice)}
              onOpenMenu={() => setActiveNoticeId(notice.id)}
              onCloseMenu={() => setActiveNoticeId(null)}
            />
          ))
        )}
      </div>
    </FullScreenOverlay>
  )
}

export { NoticePageContent }
