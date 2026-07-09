"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

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
import { ChatBubble } from "@/features/chat/components/chat-bubble"
import { ChatMessageInput } from "@/features/chat/components/chat-message-input"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { ChatRoomMoreHeader } from "@/features/chat/components/chat-room-more-header"
import { ChatRoomProfile } from "@/features/chat/components/chat-room-profile"
import { ChatRoomInfoSection } from "@/features/chat/components/chat-room-info-section"
import { ChatRoomMemberItem } from "@/features/chat/components/chat-room-member-item"
import { ChatRoomDangerActions } from "@/features/chat/components/chat-room-danger-actions"
import { SectionTitle } from "@/features/chat/components/section-title"
import { useLongPress } from "@/features/chat/hooks/use-long-press"
import { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME } from "@/lib/hooks/use-fade-scrollbar"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getKstDateKey, formatKstFullDate, formatKstShortDate } from "@/lib/date/kst"
import { cn } from "@/lib/utils"
import { MOCK_CHATS, MOCK_MEMBERS, MOCK_MESSAGES } from "@/features/chat/constants/mock-data"

type Chat = (typeof MOCK_CHATS)[number]
type Message = (typeof MOCK_MESSAGES)[number]

// 롱프레스 메뉴(최대 3개 항목) 높이 추정치 + 하단 입력창과 겹치지 않기 위한 여유 공간
const MESSAGE_MENU_HEIGHT_ESTIMATE = 180
const MESSAGE_BOTTOM_SAFE_AREA = 96

interface MessageRowProps {
  message: Message
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
  onRegisterRef: (id: string, el: HTMLDivElement | null) => void
  onReplyQuoteClick?: () => void
  highlightedIndex?: number
  onHighlightAnimationEnd?: () => void
}

function MessageRow({
  message,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
  onRegisterRef,
  onReplyQuoteClick,
  highlightedIndex,
  onHighlightAnimationEnd,
}: MessageRowProps) {
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
    <div
      ref={(el) => {
        rowRef.current = el
        onRegisterRef(message.id, el)
      }}
      className="relative"
      {...longPress}
    >
      <ChatBubble
        sender={message.sender}
        variant={message.variant}
        name={message.name}
        texts={message.texts}
        replyLabel={message.replyLabel}
        replyQuote={message.replyQuote}
        replyText={message.replyText}
        onReplyQuoteClick={onReplyQuoteClick}
        highlightedIndex={highlightedIndex}
        onHighlightAnimationEnd={onHighlightAnimationEnd}
        time={message.time}
        className={cn(menuOpen && "relative z-50")}
      />
      {menuOpen && (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            // others 말풍선은 아바타(26px) + gap(8px)만큼 오른쪽으로 밀어 말풍선 좌측 라인에 맞춘다.
            isMe ? "right-0" : "left-[34px]",
            placement === "top" ? "bottom-full mb-3" : "top-full mt-2"
          )}
        />
      )}
    </div>
  )
}

interface ChatRoomPageContentProps {
  chat: Chat
}

function ChatRoomPageContent({ chat }: ChatRoomPageContentProps) {
  const router = useRouter()
  const { messages } = useTranslation()

  const [notice, setNotice] = React.useState<string | null>(chat.notice ?? null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [notificationOn, setNotificationOn] = React.useState(true)
  const [roomPinned, setRoomPinned] = React.useState(chat.pinned ?? false)
  const [cameraMenuOpen, setCameraMenuOpen] = React.useState(false)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = React.useState(false)
  const [confirmDisbandOpen, setConfirmDisbandOpen] = React.useState(false)
  const [chatMessages, setChatMessages] = React.useState<Message[]>(MOCK_MESSAGES)
  const [jumpHighlight, setJumpHighlight] = React.useState<{ id: string; index: number } | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const dateGroupRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const jumpHighlightTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const { isScrolling, onScroll: handleMessagesScroll } = useFadeScrollbar()

  const isOwner = MOCK_MEMBERS.find((member) => member.isMe)?.isOwner ?? false

  // 메시지를 한국 날짜(KST) 단위로 묶어서 날짜가 바뀔 때마다 구분선을 표시한다.
  const dateGroups = React.useMemo(() => {
    const groups: { dateKey: string; label: string; messages: Message[] }[] = []
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

  const [activeDateKey, setActiveDateKey] = React.useState<string | undefined>(dateGroups[0]?.dateKey)

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

  // 네이티브 스크롤바 thumb 위치(비율)를 계산해, 날짜 뱃지가 화면 중앙이 아니라 스크롤 thumb과 같은 높이에 붙도록 한다.
  const [scrollThumbCenter, setScrollThumbCenter] = React.useState(0)

  const updateScrollThumbCenter = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const maxScrollTop = scrollHeight - clientHeight
    const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0
    const MIN_THUMB_HEIGHT = 32
    const thumbHeight = Math.min(clientHeight, Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight))
    const thumbTravel = Math.max(clientHeight - thumbHeight, 0)
    setScrollThumbCenter(thumbHeight / 2 + scrollRatio * thumbTravel)
  }, [])

  const handleMessagesAreaScroll = () => {
    handleMessagesScroll()
    updateActiveDateKey()
    updateScrollThumbCenter()
  }

  React.useEffect(() => {
    updateActiveDateKey()
    updateScrollThumbCenter()
  }, [updateActiveDateKey, updateScrollThumbCenter])

  const activeDateBadgeText = activeDateKey ? formatKstShortDate(activeDateKey) : undefined

  // index: 원본 메시지의 texts 중 실제로 인용된 한 줄만 강조하기 위한 위치 (미지정 시 첫 줄)
  const scrollToMessage = (id: string, index = 0) => {
    const el = messageRefs.current[id]
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    // smooth 스크롤이 끝난 뒤에 하이라이트가 시작되도록 스크롤 예상 소요 시간만큼 지연시킨다.
    clearTimeout(jumpHighlightTimerRef.current)
    jumpHighlightTimerRef.current = setTimeout(() => setJumpHighlight({ id, index }), 400)
  }

  React.useEffect(() => () => clearTimeout(jumpHighlightTimerRef.current), [])

  const handleSend = (value: string) => {
    const now = new Date()
    setChatMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        sender: "me",
        variant: "short",
        texts: [value],
        time: new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(now),
        createdAt: now.toISOString(),
      },
    ])
  }

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [chatMessages])

  const messageMenuItems = (message: Message): ChatContextMenuItem[] => {
    const text = message.variant === "reply" ? message.replyText : message.texts?.[0]
    return [
      {
        icon: <Image src="/icons/chat/respond.svg" alt="" width={24} height={24} />,
        label: messages.chat.replyAction,
        onClick: () => setActiveMessageId(null),
      },
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
          const query = message.name ? `?target=${encodeURIComponent(message.name)}` : ""
          router.push(`/chats/${chat.id}/report${query}`)
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
          title={chat.title}
          onLeadingClick={() => router.back()}
          onTrailingClick={() => setMoreOpen(true)}
          className={!notice ? "border-b border-gray-50 bg-white" : undefined}
        />
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollContainerRef}
            onScroll={handleMessagesAreaScroll}
            data-scrolling={isScrolling}
            className={cn("absolute inset-0 flex flex-col gap-3 overflow-y-auto px-4", FADE_SCROLLBAR_CLASSNAME)}
          >
            {notice && (
              // 스크롤 영역 최상단에 고정: 메시지는 이 불투명 바 뒤로 지나간다(-mx-4/bg-white로 전체 폭을 덮음).
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
                  {group.messages.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      menuOpen={activeMessageId === message.id}
                      menuItems={messageMenuItems(message)}
                      onOpenMenu={() => setActiveMessageId(message.id)}
                      onCloseMenu={() => setActiveMessageId(null)}
                      onRegisterRef={(id, el) => {
                        messageRefs.current[id] = el
                      }}
                      onReplyQuoteClick={
                        message.replyToId
                          ? () => scrollToMessage(message.replyToId!, message.replyToIndex)
                          : undefined
                      }
                      highlightedIndex={jumpHighlight?.id === message.id ? jumpHighlight.index : undefined}
                      onHighlightAnimationEnd={() => setJumpHighlight(null)}
                    />
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
          <ChatMessageInput onSend={handleSend} onCameraClick={() => setCameraMenuOpen((prev) => !prev)} />
        </div>
      </main>

      <SidePanel open={moreOpen} onOpenChange={setMoreOpen}>
        <SidePanelPortal>
          <SidePanelBackdrop />
          <SidePanelViewport>
            <SidePanelPopup>
              <ChatRoomMoreHeader
                onBack={() => setMoreOpen(false)}
                notificationOn={notificationOn}
                onToggleNotification={() => setNotificationOn((prev) => !prev)}
                pinned={roomPinned}
                onTogglePin={() => setRoomPinned((prev) => !prev)}
              />
              <SidePanelContent className="items-center gap-3 px-4 pb-6">
                <ChatRoomProfile title={chat.title} />
                <ChatRoomInfoSection
                className="w-full"
                onNoticeClick={() => router.push(`/chats/${chat.id}/notices`)}
                onScheduleClick={() => router.push(`/chats/${chat.id}/schedule`)}
              />
                <div className="flex w-full flex-col rounded-2xl bg-gray-50">
                  <SectionTitle title={messages.chat.membersTitle} count={MOCK_MEMBERS.length} padding="12" />
                  {MOCK_MEMBERS.map((member) => (
                    <ChatRoomMemberItem
                      key={member.id}
                      name={member.name}
                      isMe={member.isMe}
                      isOwner={member.isOwner}
                      flagSrc={member.flagSrc}
                      nation={messages.countries[member.countryCode]}
                      onRemove={isOwner && !member.isMe ? () => console.log("remove", member.id) : undefined}
                    />
                  ))}
                </div>
                <ChatRoomDangerActions
                  className="w-full"
                  onLeave={() => setConfirmLeaveOpen(true)}
                  onDisband={isOwner ? () => setConfirmDisbandOpen(true) : undefined}
                />
              </SidePanelContent>
            </SidePanelPopup>
          </SidePanelViewport>
        </SidePanelPortal>
      </SidePanel>

      <ConfirmDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title={messages.chat.leaveChatConfirmTitle}
        description={messages.chat.leaveChatConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.leaveChatAction}
        onConfirm={() => router.push("/chats")}
      />
      <ConfirmDialog
        open={confirmDisbandOpen}
        onOpenChange={setConfirmDisbandOpen}
        title={messages.chat.disbandChatConfirmTitle}
        description={messages.chat.disbandChatConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.disbandChatAction}
        onConfirm={() => router.push("/chats")}
      />
    </>
  )
}

export { ChatRoomPageContent }
