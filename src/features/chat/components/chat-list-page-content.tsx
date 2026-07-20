"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SearchBox } from "@/components/ui/search-box"
import { Circle } from "@/components/ui/circle"
import { ChatFilterChips, type ChatFilterCategory } from "@/features/chat/components/chat-filter-chips"
import { ChatListItem } from "@/features/chat/components/chat-list-item"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useChatRoomsView } from "@/features/chat/hooks/use-chat-queries"
import {
  useLeaveChatRoom,
  useSetNotify,
  useSetPinned,
} from "@/features/chat/hooks/use-chat-mutations"
import type { ChatListEntry } from "@/features/chat/lib/chat-adapter"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"
import { hangulIncludes } from "@/lib/hangul-includes"
import { routes } from "@/lib/navigation/routes"

// 하단 고정 TabBar와 겹치지 않기 위한 여유 공간 (메뉴 높이는 contextMenuHeight 로 계산)
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
      setPlacement(spaceBelow < contextMenuHeight(menuItems.length) + BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative">
      <ChatListItem
        title={chat.title}
        avatarSrc={chat.avatarSrc}
        secondaryAvatarSrc={chat.secondaryAvatarSrc}
        grouped={chat.grouped}
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
          className={placement === "top" ? "bottom-full left-0 mb-5" : "top-full left-0 mt-3"}
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
  const [leaveError, setLeaveError] = React.useState<string | null>(null)

  const { entries, isLoading } = useChatRoomsView()
  const setPinnedMutation = useSetPinned()
  const setNotifyMutation = useSetNotify()
  const leaveChatRoomMutation = useLeaveChatRoom()

  const filteredChats = React.useMemo(() => {
    const normalizedQuery = query.trim()
    return entries
      .filter((chat) => category === "all" || chat.category === category)
      .filter((chat) => !normalizedQuery || hangulIncludes(chat.title, normalizedQuery))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [entries, query, category])

  const menuItemsFor = (chat: ChatListEntry): ChatContextMenuItem[] => {
    const canPinRoom = chat.category !== "question"

    return [
      ...(canPinRoom ? [{
        icon: <Image src="/icons/chat/pin-line.svg" alt="" width={24} height={24} />,
        label: messages.chat.pinAction,
        disabled: setPinnedMutation.isPending,
        onClick: () => {
          setPinnedMutation.mutate({ roomId: chat.roomId, pinned: !chat.pinned })
          setOpenMenuRoomId(null)
        },
      }] : []),
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
      label: chat.roomType === "group" ? messages.meetup.leaveButton : messages.chat.deleteAction,
      tone: "destructive",
      disabled: leaveChatRoomMutation.isPending,
      onClick: () => {
        setLeaveError(null)
        leaveChatRoomMutation.mutate(
          { roomId: chat.roomId, roomType: chat.roomType, meetingId: chat.meetingId },
          {
            onError: (error) => {
              setLeaveError(
                chat.roomType === "group"
                  ? getMeetupErrorMessage(error, messages)
                  : messages.chat.leaveFailed
              )
            },
          }
        )
        setOpenMenuRoomId(null)
      },
    },
    ]
  }

  return (
    <>
      <main className="app-column flex flex-col gap-2 px-4 pt-[calc(1rem+var(--safe-area-top))] pb-[calc(7rem+var(--safe-area-bottom))]">
        {/* 검색바 상단 여백은 홈(home-map-screen)과 동일하게 컨테이너 p-4(16px)만 사용한다. */}
        <div className="flex items-center gap-2">
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
        {leaveError && (
          <p role="alert" className="px-1 text-body-regular-12 text-red">
            {leaveError}
          </p>
        )}
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
    </>
  )
}

export { ChatListPageContent }
