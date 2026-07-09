"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SearchBox } from "@/components/ui/search-box"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FriendListAppBar } from "@/features/friends/components/friend-list-app-bar"
import { SectionTitle } from "@/features/chat/components/section-title"
import { FriendRequestItem } from "@/features/friends/components/friend-request-item"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import {
  useFriendRequests,
  useFriends,
  useUserSearch,
} from "@/features/friends/hooks/use-friends-queries"
import {
  useAcceptFriendRequest,
  useBlockUser,
  useRemoveFriend,
  useSendFriendRequest,
} from "@/features/friends/hooks/use-friend-mutations"
import { getFriendErrorMessage } from "@/features/friends/lib/friend-error"
import type { FriendEntry, SearchEntry } from "@/features/friends/lib/friend-adapter"

type ConfirmAction =
  | { type: "reject"; target: FriendEntry }
  | { type: "block"; target: FriendEntry }
  | { type: "remove"; target: FriendEntry }
  | { type: "cancelRequest"; target: FriendEntry }

// 컨텍스트 메뉴(2개 항목) 높이 추정치 + 화면 하단(홈 인디케이터)과 겹치지 않기 위한 여유 공간
const FRIEND_CONTEXT_MENU_HEIGHT_ESTIMATE = 130
const FRIEND_BOTTOM_SAFE_AREA = 24

function FriendListPageContent() {
  const router = useRouter()
  const { messages } = useTranslation()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query.trim())
  const isSearching = query.trim().length > 0

  const friendsQuery = useFriends()
  const requestsQuery = useFriendRequests("received")
  const sentRequestsQuery = useFriendRequests("sent")
  const searchQuery = useUserSearch(debouncedQuery)

  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()

  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction | null>(null)
  const [openMenuFriendId, setOpenMenuFriendId] = React.useState<number | null>(null)
  // 검색 결과에서 방금 요청 보낸 유저 — 서버가 isFriend를 즉시 반영하지 않으므로 버튼 상태를 로컬로 유지
  const [requestedIds, setRequestedIds] = React.useState<Set<number>>(new Set())
  const [actionError, setActionError] = React.useState<string | null>(null)

  const friends = friendsQuery.data ?? []
  const requests = requestsQuery.data ?? []
  const sentRequests = sentRequestsQuery.data ?? []
  const searchResults = searchQuery.data ?? []

  // 서버 기준 "이미 요청 보낸 유저" — 재검색·새로고침 후에도 유지되는 진실 공급원.
  // requestedIds(로컬 Set)는 방금 요청을 보내 sentRequests 쿼리가 아직 갱신되지 않은 찰나의 텀만 보완한다.
  const sentRequestUserIds = React.useMemo(
    () => new Set(sentRequests.map((request) => request.userId)),
    [sentRequests]
  )

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const showError = (error: unknown) => setActionError(getFriendErrorMessage(error, messages))

  const activeFriend = friends.find((friend) => friend.userId === openMenuFriendId) ?? null

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

  const handleAccept = (request: FriendEntry) => {
    acceptRequest.mutate(request.userId, { onError: showError })
  }

  const handleCancelRequest = (request: FriendEntry) => {
    setConfirmAction({ type: "cancelRequest", target: request })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    const { type, target } = confirmAction
    const mutation = type === "block" ? blockUser : removeFriend
    mutation.mutate(target.userId, { onError: showError })
    setConfirmAction(null)
  }

  const handleAddFriend = (userId: number) => {
    sendRequest.mutate(userId, {
      onSuccess: () => setRequestedIds((prev) => new Set(prev).add(userId)),
      onError: showError,
    })
  }

  const nationOf = (entry: FriendEntry) =>
    entry.countryCode ? messages.countries[entry.countryCode] : undefined

  const renderFriendItem = (friend: FriendEntry) => (
    <FriendRequestItemWithLongPress
      key={friend.userId}
      friend={friend}
      highlightQuery={query}
      nation={nationOf(friend)}
      menuOpen={openMenuFriendId === friend.userId}
      menuItems={friendMenuItems}
      onOpenMenu={() => setOpenMenuFriendId(friend.userId)}
      onCloseMenu={() => setOpenMenuFriendId(null)}
      onStartChat={() => router.push(`/chats/${friend.userId}`)}
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
                      key={request.userId}
                      name={request.nickname}
                      avatarSrc={request.avatarSrc}
                      variant="request"
                      onAccept={() => handleAccept(request)}
                      onReject={() => setConfirmAction({ type: "reject", target: request })}
                    />
                  ))}
                </div>
              )}

              {sentRequests.length > 0 && (
                <div className="flex flex-col items-start pt-3">
                  <SectionTitle title={messages.chat.sentRequestsTitle} count={sentRequests.length} />
                  {sentRequests.map((request) => (
                    <FriendRequestItem
                      key={request.userId}
                      name={request.nickname}
                      avatarSrc={request.avatarSrc}
                      variant="sent"
                      onCancel={() => handleCancelRequest(request)}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col items-start pt-3">
                <SectionTitle title={messages.chat.myFriendsSectionTitle} count={friends.length} />
                {friendsQuery.isError ? (
                  <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                    {messages.friends.loadError}
                  </p>
                ) : friends.length === 0 && !friendsQuery.isPending ? (
                  <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                    {messages.friends.emptyFriends}
                  </p>
                ) : (
                  friends.map(renderFriendItem)
                )}
              </div>
            </>
          )}

          {isSearching && (
            <div className="flex flex-col items-start pt-3">
              {searchResults.length === 0 && !searchQuery.isPending ? (
                <p className="w-full pt-6 text-center text-body-regular-14 text-gray-400">
                  {messages.friends.searchEmpty}
                </p>
              ) : (
                searchResults.map((user: SearchEntry) => {
                  const requested = requestedIds.has(user.userId) || sentRequestUserIds.has(user.userId)
                  return (
                    <FriendRequestItem
                      key={user.userId}
                      name={user.nickname}
                      avatarSrc={user.avatarSrc}
                      highlightQuery={query}
                      flagSrc={user.flagSrc}
                      nation={nationOf(user)}
                      variant={user.isFriend ? "friend" : requested ? "requested" : "add"}
                      onAdd={() => handleAddFriend(user.userId)}
                      onStartChat={() => router.push(`/chats/${user.userId}`)}
                    />
                  )
                })
              )}
            </div>
          )}
        </div>
      </main>

      {actionError && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm justify-center px-4">
          <div className="rounded-xl bg-gray-900/90 px-4 py-2.5 text-body-regular-14 text-white">
            {actionError}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={
            confirmAction.type === "reject"
              ? messages.chat.rejectConfirmTitle(confirmAction.target.nickname)
              : confirmAction.type === "block"
                ? messages.chat.blockFriendConfirmTitle(confirmAction.target.nickname)
                : confirmAction.type === "cancelRequest"
                  ? messages.chat.cancelRequestConfirmTitle(confirmAction.target.nickname)
                  : messages.chat.removeFriendConfirmTitle(confirmAction.target.nickname)
          }
          description={
            confirmAction.type === "reject"
              ? messages.chat.rejectConfirmDescription
              : confirmAction.type === "block"
                ? messages.chat.blockFriendConfirmDescription
                : confirmAction.type === "cancelRequest"
                  ? messages.chat.cancelRequestConfirmDescription
                  : messages.chat.removeFriendConfirmDescription
          }
          cancelLabel={messages.chat.cancelButton}
          confirmLabel={
            confirmAction.type === "reject"
              ? messages.chat.rejectButton
              : confirmAction.type === "block"
                ? messages.chat.blockAction
                : confirmAction.type === "cancelRequest"
                  ? messages.chat.cancelRequestButton
                  : messages.chat.deleteAction
          }
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  )
}

interface FriendRequestItemWithLongPressProps {
  friend: FriendEntry
  highlightQuery: string
  nation?: string
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
        name={friend.nickname}
        avatarSrc={friend.avatarSrc}
        highlightQuery={highlightQuery}
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
