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
import { useTranslation } from "@/lib/i18n/use-translation"
import { hangulIncludes } from "@/lib/hangul-includes"
import { MOCK_CHATS } from "@/features/chat/constants/mock-data"

type Chat = (typeof MOCK_CHATS)[number]

// 컨텍스트 메뉴(3개 항목) 높이 추정치 + 하단 고정 TabBar와 겹치지 않기 위한 여유 공간
const CONTEXT_MENU_HEIGHT_ESTIMATE = 180
const BOTTOM_SAFE_AREA = 96

interface ChatRowProps {
  chat: Chat
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
        online={chat.online}
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
  const [openMenuChatId, setOpenMenuChatId] = React.useState<string | null>(null)

  const filteredChats = React.useMemo(() => {
    const normalizedQuery = query.trim()
    return MOCK_CHATS.filter((chat) => category === "all" || chat.category === category)
      .filter((chat) => !normalizedQuery || hangulIncludes(chat.title, normalizedQuery))
      .sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false))
  }, [query, category])

  const menuItems: ChatContextMenuItem[] = [
    {
      icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />,
      label: messages.chat.pinAction,
      onClick: () => setOpenMenuChatId(null),
    },
    {
      icon: <Image src="/icons/chat/alarm-off.svg" alt="" width={24} height={24} />,
      label: messages.chat.muteAction,
      onClick: () => setOpenMenuChatId(null),
    },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
      onClick: () => setOpenMenuChatId(null),
    },
  ]

  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-col gap-2 p-4 pb-28">
        <div className="flex items-center gap-2 py-2">
          <SearchBox
            placeholder={messages.chat.listSearchPlaceholder}
            className="flex-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Circle iconSrc="/icons/circle/friend-list.svg" />
        </div>
        <ChatFilterChips value={category} onChange={setCategory} />
        <div className="flex flex-col">
          {filteredChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              highlightQuery={query}
              menuOpen={openMenuChatId === chat.id}
              menuItems={menuItems}
              onOpenMenu={() => setOpenMenuChatId(chat.id)}
              onCloseMenu={() => setOpenMenuChatId(null)}
              onNavigate={() => router.push(`/chats/${chat.id}`)}
            />
          ))}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm">
        <TabBar />
      </div>
    </>
  )
}

export { ChatListPageContent }
