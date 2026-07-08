"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SearchBox } from "@/components/ui/search-box"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FriendListAppBar } from "@/features/chat/components/friend-list-app-bar"
import { SectionTitle } from "@/features/chat/components/section-title"
import { FriendRequestItem } from "@/features/chat/components/friend-request-item"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"
import { hangulIncludes } from "@/lib/hangul-includes"
import {
  MOCK_FRIEND_REQUESTS,
  MOCK_MY_FRIENDS,
  MOCK_RECOMMENDED_FRIENDS,
} from "@/features/chat/constants/mock-data"
type FriendRequest = (typeof MOCK_FRIEND_REQUESTS)[number]
type Friend = (typeof MOCK_MY_FRIENDS)[number]
type RecommendedFriend = (typeof MOCK_RECOMMENDED_FRIENDS)[number]

type ConfirmAction =
  | { type: "reject"; target: FriendRequest }
  | { type: "block"; target: Friend }
  | { type: "remove"; target: Friend }

// 컨텍스트 메뉴(2개 항목) 높이 추정치 + 화면 하단(홈 인디케이터)과 겹치지 않기 위한 여유 공간
const FRIEND_CONTEXT_MENU_HEIGHT_ESTIMATE = 130
const FRIEND_BOTTOM_SAFE_AREA = 24

function FriendListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()

  const [query, setQuery] = React.useState("")
  const [requests, setRequests] = React.useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS)
  const [friends, setFriends] = React.useState<Friend[]>(MOCK_MY_FRIENDS)
  const [recommended, setRecommended] = React.useState<RecommendedFriend[]>(MOCK_RECOMMENDED_FRIENDS)
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction | null>(null)
  const [openMenuFriendId, setOpenMenuFriendId] = React.useState<string | null>(null)

  const isSearching = query.trim().length > 0

  const filteredRequests = React.useMemo(
    () => requests.filter((request) => hangulIncludes(request.name, query)),
    [requests, query]
  )
  const filteredFriends = React.useMemo(
    () => friends.filter((friend) => hangulIncludes(friend.name, query)),
    [friends, query]
  )
  const filteredRecommended = React.useMemo(
    () => recommended.filter((friend) => hangulIncludes(friend.name, query)),
    [recommended, query]
  )

  const activeFriend = friends.find((friend) => friend.id === openMenuFriendId) ?? null

  const friendMenuItems: ChatContextMenuItem[] = [
    {
      icon: <Image src="/icons/chat/block.svg" alt="" width={24} height={24} />,
      label: messages.chat.blockAction,
      tone: "destructive",
      onClick: () => {
        if (activeFriend) setConfirmAction({ type: "block", target: activeFriend })
        setOpenMenuFriendId(null)
      },
    },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
      onClick: () => {
        if (activeFriend) setConfirmAction({ type: "remove", target: activeFriend })
        setOpenMenuFriendId(null)
      },
    },
  ]

  const handleAccept = (request: FriendRequest) => {
    setRequests((prev) => prev.filter((item) => item.id !== request.id))
    setFriends((prev) => [{ id: request.id, name: request.name, countryCode: request.countryCode, flagSrc: request.flagSrc }, ...prev])
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    if (confirmAction.type === "reject") {
      setRequests((prev) => prev.filter((item) => item.id !== confirmAction.target.id))
    } else {
      setFriends((prev) => prev.filter((friend) => friend.id !== confirmAction.target.id))
    }
    setConfirmAction(null)
  }

  const handleAddFriend = (friendId: string) => {
    setRecommended((prev) => prev.map((friend) => (friend.id === friendId ? { ...friend, requested: true } : friend)))
  }

  const renderFriendItem = (friend: Friend) => (
    <FriendRequestItemWithLongPress
      key={friend.id}
      friend={friend}
      highlightQuery={query}
      nation={messages.countries[friend.countryCode]}
      menuOpen={openMenuFriendId === friend.id}
      menuItems={friendMenuItems}
      onOpenMenu={() => setOpenMenuFriendId(friend.id)}
      onCloseMenu={() => setOpenMenuFriendId(null)}
      onStartChat={() => router.push(`/chats/${friend.id}`)}
    />
  )

  return (
    <>
      <main className="mx-auto flex w-full max-w-sm flex-col">
        <FriendListAppBar onBack={() => router.back()} />
        <div className="flex flex-col gap-2 px-4 pb-10">
          <SearchBox
            placeholder={messages.chat.friendSearchPlaceholder}
            tone="flat"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {!isSearching && (
            <>
              {requests.length > 0 && (
                <div className="flex flex-col items-start pt-3">
                  <SectionTitle title={messages.chat.receivedRequestsTitle} count={requests.length} />
                  {requests.map((request) => (
                    <FriendRequestItem
                      key={request.id}
                      name={request.name}
                      flagSrc={request.flagSrc}
                      nation={messages.countries[request.countryCode]}
                      variant="request"
                      onAccept={() => handleAccept(request)}
                      onReject={() => setConfirmAction({ type: "reject", target: request })}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col items-start pt-3">
                <SectionTitle title={messages.chat.myFriendsSectionTitle} count={friends.length} />
                {friends.map(renderFriendItem)}
              </div>
            </>
          )}

          {isSearching && (
            <>
              {filteredRequests.length > 0 && (
                <div className="flex flex-col items-start pt-3">
                  <SectionTitle title={messages.chat.receivedRequestsTitle} />
                  {filteredRequests.map((request) => (
                    <FriendRequestItem
                      key={request.id}
                      name={request.name}
                      highlightQuery={query}
                      flagSrc={request.flagSrc}
                      nation={messages.countries[request.countryCode]}
                      variant="request"
                      onAccept={() => handleAccept(request)}
                      onReject={() => setConfirmAction({ type: "reject", target: request })}
                    />
                  ))}
                </div>
              )}

              {filteredFriends.length > 0 && (
                <div className="flex flex-col items-start pt-3">
                  <SectionTitle title={messages.chat.myFriendsSectionTitle} />
                  {filteredFriends.map(renderFriendItem)}
                </div>
              )}

              {filteredRecommended.length > 0 && (
                <div className="flex flex-col items-start pt-3">
                  <SectionTitle title={messages.chat.recommendedFriendsTitle} />
                  {filteredRecommended.map((friend) => (
                    <FriendRequestItem
                      key={friend.id}
                      name={friend.name}
                      highlightQuery={query}
                      flagSrc={friend.flagSrc}
                      nation={messages.countries[friend.countryCode]}
                      variant={friend.requested ? "requested" : "add"}
                      onAdd={() => handleAddFriend(friend.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={
            confirmAction.type === "reject"
              ? messages.chat.rejectConfirmTitle(confirmAction.target.name)
              : confirmAction.type === "block"
                ? messages.chat.blockFriendConfirmTitle(confirmAction.target.name)
                : messages.chat.removeFriendConfirmTitle(confirmAction.target.name)
          }
          description={
            confirmAction.type === "reject"
              ? messages.chat.rejectConfirmDescription
              : confirmAction.type === "block"
                ? messages.chat.blockFriendConfirmDescription
                : messages.chat.removeFriendConfirmDescription
          }
          cancelLabel={messages.chat.cancelButton}
          confirmLabel={
            confirmAction.type === "reject"
              ? messages.chat.rejectButton
              : confirmAction.type === "block"
                ? messages.chat.blockAction
                : messages.chat.deleteAction
          }
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  )
}

interface FriendRequestItemWithLongPressProps {
  friend: Friend
  highlightQuery: string
  nation: string
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
  onStartChat: () => void
}

function FriendRequestItemWithLongPress({
  friend,
  highlightQuery,
  nation,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
  onStartChat,
}: FriendRequestItemWithLongPressProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(
        spaceBelow < FRIEND_CONTEXT_MENU_HEIGHT_ESTIMATE + FRIEND_BOTTOM_SAFE_AREA ? "top" : "bottom"
      )
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative w-full">
      <FriendRequestItem
        name={friend.name}
        highlightQuery={highlightQuery}
        flagSrc={friend.flagSrc}
        nation={nation}
        variant="friend"
        active={menuOpen}
        onStartChat={onStartChat}
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

export { FriendListPageContent }
