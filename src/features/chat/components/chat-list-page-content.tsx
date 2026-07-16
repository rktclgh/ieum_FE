"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SearchBox } from "@/components/ui/search-box"
import { Circle } from "@/components/ui/circle"
import { TabBar } from "@/features/navigation/components/tab-bar"
import { ChatFilterChips, type ChatFilterCategory } from "@/features/chat/components/chat-filter-chips"
import { ChatListItem } from "@/features/chat/components/chat-list-item"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useChatRoomsView } from "@/features/chat/hooks/use-chat-queries"
import {
  useLeaveRoom,
  useSetNotify,
  useSetPinned,
} from "@/features/chat/hooks/use-chat-mutations"
import type { ChatListEntry } from "@/features/chat/lib/chat-adapter"
import { useTranslation } from "@/lib/i18n/use-translation"
import { hangulIncludes } from "@/lib/hangul-includes"
import { routes } from "@/lib/navigation/routes"

// 컨텍스트 메뉴(3개 항목) 높이 추정치 + 하단 고정 TabBar와 겹치지 않기 위한 여유 공간
const CONTEXT_MENU_HEIGHT_ESTIMATE = 180
const BOTTOM_SAFE_AREA = 96

interface ChatRowProps {
  chat: ChatListEntry
  highlightQuery: string
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
  onNavigate: () => void
}

function ChatRow({ chat, highlightQuery, menuOpen, menuItems, onOpenMenu, onCloseMenu, onNavigate }: ChatRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < CONTEXT_MENU_HEIGHT_ESTIMATE + BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative">
      <ChatListItem
        title={chat.title}
        avatarSrc={chat.avatarSrc}
        memberCount={chat.memberCount}
        lastMessage={chat.lastMessage}
        time={chat.time}
        unreadCount={chat.unreadCount}
        pinned={chat.pinned}
        highlightQuery={highlightQuery}
        active={menuOpen}
        onClick={onNavigate}
        {...longPress}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={placement === "top" ? "bottom-full left-0 mb-3" : "top-full left-0 mt-2"}
        />
      )}
    </div>
  )
}

function ChatListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<ChatFilterCategory>("all")
  const [openMenuRoomId, setOpenMenuRoomId] = React.useState<number | null>(null)

  const { entries, isLoading } = useChatRoomsView()
  const setPinnedMutation = useSetPinned()
  const setNotifyMutation = useSetNotify()
  const leaveRoomMutation = useLeaveRoom()

  const filteredChats = React.useMemo(() => {
    const normalizedQuery = query.trim()
    return entries
      .filter((chat) => category === "all" || chat.category === category)
      .filter((chat) => !normalizedQuery || hangulIncludes(chat.title, normalizedQuery))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [entries, query, category])

  const menuItemsFor = (chat: ChatListEntry): ChatContextMenuItem[] => [
    {
      icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />,
      label: messages.chat.pinAction,
      onClick: () => {
        setPinnedMutation.mutate({ roomId: chat.roomId, pinned: !chat.pinned })
        setOpenMenuRoomId(null)
      },
    },
    {
      icon: (
        <Image
          src={chat.notifyEnabled ? "/icons/chat/alarm-off.svg" : "/icons/chat/alarm-on.svg"}
          alt=""
          width={24}
          height={24}
        />
      ),
      label: chat.notifyEnabled
        ? messages.chat.disableNotificationAction
        : messages.chat.enableNotificationAction,
      disabled: setNotifyMutation.isPending,
      onClick: () => {
        setNotifyMutation.mutate({ roomId: chat.roomId, enabled: !chat.notifyEnabled })
        setOpenMenuRoomId(null)
      },
    },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
      onClick: () => {
        leaveRoomMutation.mutate(chat.roomId)
        setOpenMenuRoomId(null)
      },
    },
  ]

  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-col gap-2 p-4 pb-28">
        <div className="flex items-center gap-2 py-2">
          <SearchBox
            placeholder={messages.chat.listSearchPlaceholder}
            className="flex-1"
            tone="flat"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Circle
            iconSrc="/icons/circle/friend-list.svg"
            aria-label={messages.chat.myFriendsTitle}
            tone="flat"
            onClick={() => router.push(routes.friends())}
          />
        </div>
        <ChatFilterChips value={category} onChange={setCategory} />
        <div className="flex flex-col">
          {filteredChats.map((chat) => (
            <ChatRow
              key={chat.roomId}
              chat={chat}
              highlightQuery={query}
              menuOpen={openMenuRoomId === chat.roomId}
              menuItems={menuItemsFor(chat)}
              onOpenMenu={() => setOpenMenuRoomId(chat.roomId)}
              onCloseMenu={() => setOpenMenuRoomId(null)}
              onNavigate={() => router.push(routes.chatRoom(chat.roomId))}
            />
          ))}
          {!isLoading && filteredChats.length === 0 && (
            <p className="py-16 text-center text-body-medium-14 text-gray-400">
              {messages.chat.emptyList}
            </p>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </>
  )
}

export { ChatListPageContent }
