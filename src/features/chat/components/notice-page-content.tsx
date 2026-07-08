"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { NoticeListItem } from "@/features/chat/components/notice-list-item"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"
import { MOCK_NOTICES } from "@/features/chat/constants/mock-data"

type Notice = (typeof MOCK_NOTICES)[number]

interface NoticeRowProps {
  notice: Notice
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function NoticeRow({ notice, menuOpen, menuItems, onOpenMenu, onCloseMenu }: NoticeRowProps) {
  const longPress = useLongPress({ onLongPress: onOpenMenu })

  return (
    <div className="relative" {...longPress}>
      <NoticeListItem
        title={notice.title}
        authorName={notice.authorName}
        authorAvatarSrc={notice.authorAvatarSrc}
        time={notice.time}
        pinned={notice.pinned}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          // 아바타(40px) + gap(12px)만큼 밀어 제목 좌측 라인에 맞춘다
          className="top-full left-[52px] mt-2"
        />
      )}
    </div>
  )
}

function NoticePageContent() {
  const router = useRouter()
  const { messages } = useTranslation()

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
    <div className="fixed inset-0 mx-auto flex w-full max-w-sm flex-col overflow-hidden bg-white">
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
              menuOpen={activeNoticeId === notice.id}
              menuItems={menuItemsFor(notice)}
              onOpenMenu={() => setActiveNoticeId(notice.id)}
              onCloseMenu={() => setActiveNoticeId(null)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export { NoticePageContent }
