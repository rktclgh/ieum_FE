"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  SidePanel,
  SidePanelBackdrop,
  SidePanelContent,
  SidePanelPopup,
  SidePanelPortal,
  SidePanelViewport,
} from "@/components/ui/side-panel"
import { NoticeBanner } from "@/features/chat/components/notice-banner"
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider"
import { ChatScrollDateBadge } from "@/features/chat/components/chat-scroll-date-badge"
import { ChatBubbleSegment, bubblePosition } from "@/features/chat/components/chat-bubble-segment"
import { ChatMessageGroup } from "@/features/chat/components/chat-message-group"
import { ChatMessageInput } from "@/features/chat/components/chat-message-input"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { ChatRoomMoreHeader } from "@/features/chat/components/chat-room-more-header"
import { ChatRoomProfile } from "@/features/chat/components/chat-room-profile"
import { ChatRoomInfoSection } from "@/features/chat/components/chat-room-info-section"
import { ChatRoomMemberItem } from "@/features/chat/components/chat-room-member-item"
import { ChatRoomDangerActions } from "@/features/chat/components/chat-room-danger-actions"
import { SectionTitle } from "@/features/chat/components/section-title"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import {
  chatKeys,
  useChatMessages,
  useChatRoom,
  useChatSessionAccess,
} from "@/features/chat/hooks/use-chat-queries"
import {
  useDisbandRoom,
  useLeaveRoom,
  useMarkRead,
  useSetNotify,
  useSetPinned,
} from "@/features/chat/hooks/use-chat-mutations"
import { useChatRoomSocket } from "@/features/chat/lib/chat-socket"
import {
  adaptMember,
  adaptMessage,
  buildMessageRuns,
  resolveRoomTitle,
  type ChatBubbleMessage,
} from "@/features/chat/lib/chat-adapter"
import type { ChatSessionAccess } from "@/features/chat/lib/chat-session"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME } from "@/lib/hooks/use-fade-scrollbar"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getKstDateKey, formatKstFullDate, formatKstShortDate } from "@/lib/date/kst"
import { routes } from "@/lib/navigation/routes"
import { cn } from "@/lib/utils"

// 롱프레스 메뉴(최대 3개 항목) 높이 추정치 + 하단 입력창과 겹치지 않기 위한 여유 공간
const MESSAGE_MENU_HEIGHT_ESTIMATE = 180
const MESSAGE_BOTTOM_SAFE_AREA = 96

interface MessageRowProps {
  message: ChatBubbleMessage
  position: "solo" | "first" | "middle" | "last"
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function MessageRow({ message, position, menuOpen, menuItems, onOpenMenu, onCloseMenu }: MessageRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const isMe = message.sender === "me"

  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(spaceBelow < MESSAGE_MENU_HEIGHT_ESTIMATE + MESSAGE_BOTTOM_SAFE_AREA ? "top" : "bottom")
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative" {...longPress}>
      <ChatBubbleSegment
        sender={message.sender}
        text={message.texts[0] ?? ""}
        position={position}
        variant={message.variant}
        className={cn(menuOpen && "relative z-50")}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            isMe ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-3" : "top-full mt-2"
          )}
        />
      )}
    </div>
  )
}

interface ChatRoomPageContentProps {
  roomId: number
}

interface ChatRoomSessionContentProps extends ChatRoomPageContentProps {
  session: ChatSessionAccess
}

// createdAt + messageId 기준으로 중복 제거 후 오래된→최신 정렬한다(초기 로드 + 실시간 수신 병합).
function mergeMessages(base: ChatBubbleMessage[], live: ChatBubbleMessage[]): ChatBubbleMessage[] {
  const byId = new Map<number, ChatBubbleMessage>()
  for (const message of [...base, ...live]) {
    byId.set(message.messageId, message)
  }
  return [...byId.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.messageId - b.messageId
  })
}

function ChatRoomSessionContent({ roomId, session }: ChatRoomSessionContentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { messages } = useTranslation()
  const myUserId = session.userId ?? -1

  const { data: room } = useChatRoom(roomId, session)
  const { messages: initialMessages } = useChatMessages(roomId, session)

  const [liveMessages, setLiveMessages] = React.useState<ChatBubbleMessage[]>([])
  const [notice, setNotice] = React.useState<string | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [cameraMenuOpen, setCameraMenuOpen] = React.useState(false)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = React.useState(false)
  const [confirmDisbandOpen, setConfirmDisbandOpen] = React.useState(false)
  const [socketError, setSocketError] = React.useState<string | null>(null)

  const bottomRef = React.useRef<HTMLDivElement>(null)
  const dateGroupRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const { isScrolling, onScroll: handleMessagesScroll } = useFadeScrollbar()

  const markReadMutation = useMarkRead()
  const setPinnedMutation = useSetPinned()
  const setNotifyMutation = useSetNotify()
  const leaveRoomMutation = useLeaveRoom()
  const disbandRoomMutation = useDisbandRoom()

  const chatMessages = React.useMemo(
    () => mergeMessages(initialMessages, liveMessages),
    [initialMessages, liveMessages]
  )

  const { connected, send } = useChatRoomSocket(session.activeRoomId, {
    onMessage: (event) => {
      if (myUserId < 0) return
      setLiveMessages((prev) => [...prev, adaptMessage(event, myUserId)])
      // 새 메시지 수신 → 채팅 목록(미리보기·안읽음) 캐시를 무효화해 목록 재진입 시 최신 상태로 갱신한다.
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "rooms"] })
    },
    onError: (error) => setSocketError(error.message),
    onConnectedChange: (isConnected) => {
      if (!isConnected) return
      setSocketError(null)
      // 연결/재연결 직후 REST 스냅샷을 다시 당겨, 초기 fetch~구독 사이·재연결 중 누락된 메시지를 백필한다.
      // mergeMessages가 messageId 기준으로 중복을 제거하므로 liveMessages와 겹쳐도 안전하다.
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(roomId) })
    },
  })

  // 방 진입 시 읽음 처리.
  React.useEffect(() => {
    if (session.activeRoomId !== null) markReadMutation.mutate(session.activeRoomId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.activeRoomId])

  const questionId = room?.roomType === "question" ? room.questionId ?? undefined : undefined
  const { data: questionSummary } = useQuestionSummary(questionId ?? 0, questionId != null)

  const roomTitle = room
    ? room.roomType === "question" && questionSummary?.title
      ? questionSummary.title
      : resolveRoomTitle(room.members, myUserId, room.roomType)
    : ""
  const roomMembers = room?.members.map((member) => adaptMember(member, myUserId)) ?? []
  const notificationOn = room?.notifyEnabled ?? true
  const roomPinned = room?.pinned ?? false
  const isGroup = room?.roomType === "group"
  const isQuestionRoom = room?.roomType === "question"

  // 메시지를 한국 날짜(KST) 단위로 묶어서 날짜가 바뀔 때마다 구분선을 표시한다.
  const dateGroups = React.useMemo(() => {
    const groups: { dateKey: string; label: string; messages: ChatBubbleMessage[] }[] = []
    for (const message of chatMessages) {
      const dateKey = getKstDateKey(message.createdAt)
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.dateKey === dateKey) {
        lastGroup.messages.push(message)
      } else {
        groups.push({ dateKey, label: formatKstFullDate(message.createdAt), messages: [message] })
      }
    }
    return groups
  }, [chatMessages])

  const [activeDateKey, setActiveDateKey] = React.useState<string | undefined>(undefined)

  const updateActiveDateKey = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const containerTop = container.getBoundingClientRect().top
    let current = dateGroups[0]?.dateKey
    for (const group of dateGroups) {
      const el = dateGroupRefs.current[group.dateKey]
      if (!el) continue
      if (el.getBoundingClientRect().top - containerTop <= 4) {
        current = group.dateKey
      } else {
        break
      }
    }
    setActiveDateKey(current)
  }, [dateGroups])

  const [scrollThumbCenter, setScrollThumbCenter] = React.useState(0)

  const updateScrollThumbCenter = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight === 0) return
    const maxScrollTop = scrollHeight - clientHeight
    const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0
    const MIN_THUMB_HEIGHT = 32
    const thumbHeight = Math.min(clientHeight, Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight))
    const thumbTravel = Math.max(clientHeight - thumbHeight, 0)
    setScrollThumbCenter(thumbHeight / 2 + scrollRatio * thumbTravel)
  }, [])

  const scrollTicking = React.useRef(false)

  const handleMessagesAreaScroll = () => {
    handleMessagesScroll()
    if (!scrollTicking.current) {
      requestAnimationFrame(() => {
        updateActiveDateKey()
        updateScrollThumbCenter()
        scrollTicking.current = false
      })
      scrollTicking.current = true
    }
  }

  React.useEffect(() => {
    updateActiveDateKey()
    updateScrollThumbCenter()
  }, [updateActiveDateKey, updateScrollThumbCenter])

  const activeDateBadgeText = activeDateKey ? formatKstShortDate(activeDateKey) : undefined

  const handleSend = (value: string) => {
    if (!session.authenticated) return
    const text = value.trim()
    if (!text) return
    if (!send({ content: text })) {
      setSocketError(messages.chat.sendFailed)
    }
  }

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [chatMessages])

  const messageMenuItems = (message: ChatBubbleMessage): ChatContextMenuItem[] => {
    const text = message.texts?.[0]
    return [
      {
        icon: <Image src="/icons/chat/notification.svg" alt="" width={24} height={24} />,
        label: messages.chat.registerAsNoticeAction,
        onClick: () => {
          if (text) setNotice(text)
          setActiveMessageId(null)
        },
      },
      {
        icon: <Image src="/icons/chat/alert.svg" alt="" width={24} height={24} />,
        label: messages.chat.reportAction,
        tone: "destructive",
        onClick: () => {
          setActiveMessageId(null)
          router.push(routes.chatReport(roomId, message.messageId, message.name || undefined))
        },
      },
    ]
  }

  const cameraMenuItems: ChatContextMenuItem[] = [
    {
      icon: <Image src="/icons/chat/camera-line.svg" alt="" width={24} height={24} />,
      label: messages.chat.takePhotoAction,
      onClick: () => setCameraMenuOpen(false),
    },
    {
      icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />,
      label: messages.chat.chooseAlbumAction,
      onClick: () => setCameraMenuOpen(false),
    },
  ]

  return (
    <>
      <main className="mx-auto flex h-dvh w-full max-w-sm flex-col">
        <AppBar
          title={roomTitle}
          onLeadingClick={() => router.back()}
          trailingIcon={session.authenticated ? undefined : null}
          onTrailingClick={session.authenticated ? () => setMoreOpen(true) : undefined}
          className={!notice ? "border-b border-gray-50 bg-white" : undefined}
        />
        {session.authenticated && !connected && (
          <div className="bg-amber-50 py-1 text-center text-body-regular-12 text-amber-600">
            {messages.chat.connecting}
          </div>
        )}
        {session.authenticated && socketError && (
          <div className="bg-red-50 py-1 text-center text-body-regular-12 text-red-500">
            {socketError}
          </div>
        )}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollContainerRef}
            onScroll={handleMessagesAreaScroll}
            data-scrolling={isScrolling}
            className={cn("absolute inset-0 flex flex-col gap-3 overflow-y-auto px-4", FADE_SCROLLBAR_CLASSNAME)}
          >
            {notice && (
              <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pt-2 pb-1">
                <NoticeBanner text={notice} onClose={() => setNotice(null)} />
              </div>
            )}
            <div className="flex flex-col">
              {dateGroups.map((group) => (
                <div
                  key={group.dateKey}
                  ref={(el) => {
                    dateGroupRefs.current[group.dateKey] = el
                  }}
                  className="flex flex-col"
                >
                  <ChatDateDivider text={group.label} />
                  {buildMessageRuns(group.messages).map((run) => (
                    <ChatMessageGroup
                      key={run.runKey}
                      sender={run.sender}
                      name={run.name}
                      time={run.time}
                    >
                      {run.messages.map((message, index) => (
                        <MessageRow
                          key={message.id}
                          message={message}
                          position={bubblePosition(index, run.messages.length)}
                          menuOpen={activeMessageId === message.id}
                          menuItems={messageMenuItems(message)}
                          onOpenMenu={() => setActiveMessageId(message.id)}
                          onCloseMenu={() => setActiveMessageId(null)}
                        />
                      ))}
                    </ChatMessageGroup>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <div
            className={cn(
              "pointer-events-none absolute right-2 -translate-y-1/2",
              isScrolling && activeDateBadgeText ? "opacity-100" : "opacity-0"
            )}
            style={{ top: scrollThumbCenter }}
          >
            {activeDateBadgeText && <ChatScrollDateBadge text={activeDateBadgeText} />}
          </div>
        </div>
        <div className="relative px-4 pt-2 pb-4">
          {cameraMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setCameraMenuOpen(false)}
                role="presentation"
              />
              <ChatContextMenu items={cameraMenuItems} className="bottom-full left-4 mb-2" />
            </>
          )}
          <ChatMessageInput
            disabled={!session.authenticated}
            onSend={handleSend}
            onCameraClick={() => setCameraMenuOpen((prev) => !prev)}
          />
        </div>
      </main>

      <SidePanel
        open={session.authenticated && moreOpen}
        onOpenChange={(open) => {
          if (session.authenticated) setMoreOpen(open)
        }}
      >
        <SidePanelPortal>
          <SidePanelBackdrop />
          <SidePanelViewport>
            <SidePanelPopup>
              <ChatRoomMoreHeader
                onBack={() => setMoreOpen(false)}
                showActions={!isQuestionRoom}
                notificationOn={notificationOn}
                onToggleNotification={() => {
                  if (!session.authenticated) return
                  setNotifyMutation.mutate({ roomId, enabled: !notificationOn })
                }}
                pinned={roomPinned}
                onTogglePin={() => {
                  if (!session.authenticated) return
                  setPinnedMutation.mutate({ roomId, pinned: !roomPinned })
                }}
              />
              <SidePanelContent className="items-center gap-3 px-4 pb-6">
                <ChatRoomProfile
                  title={roomTitle}
                  avatarSrc={isQuestionRoom ? questionSummary?.imageUrl : undefined}
                />
                {!isQuestionRoom && (
                  <ChatRoomInfoSection
                    className="w-full"
                    onNoticeClick={() => router.push(routes.chatNotices(roomId))}
                    onScheduleClick={() => router.push(routes.chatSchedule(roomId))}
                  />
                )}
                <div className="flex w-full flex-col rounded-2xl bg-gray-50">
                  <SectionTitle title={messages.chat.membersTitle} count={roomMembers.length} padding="12" />
                  {roomMembers.map((member) => (
                    <ChatRoomMemberItem
                      key={member.userId}
                      name={member.name}
                      avatarSrc={member.avatarSrc}
                      isMe={member.isMe}
                      flagSrc={member.countryFlagSrc}
                      nation={member.nationalityCode ? messages.countries[member.nationalityCode] : undefined}
                    />
                  ))}
                </div>
                <ChatRoomDangerActions
                  className="w-full"
                  onLeave={() => {
                    if (session.authenticated) setConfirmLeaveOpen(true)
                  }}
                  onDisband={
                    isGroup && session.authenticated
                      ? () => setConfirmDisbandOpen(true)
                      : undefined
                  }
                />
              </SidePanelContent>
            </SidePanelPopup>
          </SidePanelViewport>
        </SidePanelPortal>
      </SidePanel>

      <ConfirmDialog
        open={session.authenticated && confirmLeaveOpen}
        onOpenChange={(open) => {
          if (session.authenticated) setConfirmLeaveOpen(open)
        }}
        title={messages.chat.leaveChatConfirmTitle}
        description={messages.chat.leaveChatConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.leaveChatAction}
        onConfirm={() => {
          if (!session.authenticated) return
          leaveRoomMutation.mutate(roomId, {
            onSuccess: () => router.push(routes.chats()),
            onError: () => setSocketError(messages.chat.leaveFailed),
          })
        }}
      />
      <ConfirmDialog
        open={session.authenticated && confirmDisbandOpen}
        onOpenChange={(open) => {
          if (session.authenticated) setConfirmDisbandOpen(open)
        }}
        title={messages.chat.disbandChatConfirmTitle}
        description={messages.chat.disbandChatConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.disbandChatAction}
        onConfirm={() => {
          if (!session.authenticated) return
          disbandRoomMutation.mutate(roomId, {
            onSuccess: () => router.push(routes.chats()),
            onError: () => setSocketError(messages.chat.disbandFailed),
          })
        }}
      />
    </>
  )
}

function ChatRoomPageContent({ roomId }: ChatRoomPageContentProps) {
  const session = useChatSessionAccess(roomId)

  return (
    <ChatRoomSessionContent
      key={session.scopeKey}
      roomId={roomId}
      session={session}
    />
  )
}

export { ChatRoomPageContent }
