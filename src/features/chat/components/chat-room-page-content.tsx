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
  useDisbandMeeting,
  useLeaveRoom,
  useMarkRead,
  useSetNotify,
  useSetPinned,
} from "@/features/chat/hooks/use-chat-mutations"
import { useChatRoomSocket } from "@/features/chat/lib/chat-socket"
import { uploadChatImage } from "@/features/chat/api/chat-file-api"
import {
  adaptMember,
  adaptMessage,
  buildMessageRuns,
  resolveRoomTitle,
  type ChatBubbleMessage,
} from "@/features/chat/lib/chat-adapter"
import { resolveChatRoomAvatar } from "@/features/chat/lib/chat-avatar"
import type { ChatSessionAccess } from "@/features/chat/lib/chat-session"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME } from "@/lib/hooks/use-fade-scrollbar"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getKstDateKey, formatKstFullDate, formatKstShortDate, formatKstTime } from "@/lib/date/kst"
import { resolveFileUrl } from "@/lib/api/file-url"
import { routes } from "@/lib/navigation/routes"
import { cn } from "@/lib/utils"

// 롱프레스 메뉴(최대 3개 항목) 높이 추정치 + 하단 입력창과 겹치지 않기 위한 여유 공간
const MESSAGE_MENU_HEIGHT_ESTIMATE = 180
const MESSAGE_BOTTOM_SAFE_AREA = 96
// 낙관적 말풍선을 서버 메시지와 같은 것으로 볼 시간 창(에코를 놓쳐 백필로 들어온 경우 매칭용).
const PENDING_MATCH_WINDOW_MS = 60_000

interface MessageRowProps {
  message: ChatBubbleMessage
  position: "solo" | "first" | "middle" | "last"
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function MessageRow({ message, position, menuOpen, menuItems, onOpenMenu, onCloseMenu }: MessageRowProps) {
  const { messages } = useTranslation()
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
        imageUrl={message.imageUrl}
        imageAlt={messages.chat.imageAlt}
        uploading={message.imageUploading}
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

// 초기 로드(base) + 실시간 수신(live)을 병합한다.
// 1) 서버 메시지(양수 id)는 messageId로 중복 제거 — 에코(live)와 재연결 백필(base)에 같은 id가 겹칠 수 있다.
// 2) 낙관적(pending) 말풍선은 대응하는 서버 메시지가 이미 있으면 버린다.
//    에코를 정상 수신하면 onMessage가 pending을 제거하므로, 이 필터는 "에코를 놓치고 백필로 들어온" 경우의 안전망이다.
//    서버가 clientNonce를 주지 않아 (내가 보냄 + 같은 내용 + 시간 창 이내)로 매칭한다. 한 서버 메시지는 최대 한 pending만 흡수.
function mergeMessages(base: ChatBubbleMessage[], live: ChatBubbleMessage[]): ChatBubbleMessage[] {
  const byId = new Map<number, ChatBubbleMessage>()
  for (const message of [...base, ...live]) {
    if (message.pending) continue
    byId.set(message.messageId, message)
  }
  const server = [...byId.values()]

  const pendings = live
    .filter((message) => message.pending)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.messageId - b.messageId))
  const claimed = new Set<number>()
  const survivingPending: ChatBubbleMessage[] = []
  for (const pending of pendings) {
    const pendingAt = new Date(pending.createdAt).getTime()
    const match = server.find(
      (message) =>
        !claimed.has(message.messageId) &&
        message.sender === "me" &&
        // 이미지 낙관 말풍선은 서버가 clientNonce를 주지 않아 내용 비교가 불가하므로,
        // "내가 보낸 이미지 메시지"끼리 시간 창 이내로 매칭한다. 텍스트는 종전대로 내용 일치.
        // 이미지 메시지의 texts는 ["사진"]이라, '사진' 텍스트 메시지가 이미지 에코와
        // 오매칭되지 않도록 텍스트끼리는 imageUrl 없는 서버 메시지로 한정한다.
        (pending.imageUploading
          ? Boolean(message.imageUrl)
          : !message.imageUrl && message.texts[0] === pending.texts[0]) &&
        Math.abs(new Date(message.createdAt).getTime() - pendingAt) < PENDING_MATCH_WINDOW_MS
    )
    if (match) claimed.add(match.messageId)
    else survivingPending.push(pending)
  }

  return [...server, ...survivingPending].sort((a, b) => {
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
  const {
    messages: initialMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(roomId, session)

  const [liveMessages, setLiveMessages] = React.useState<ChatBubbleMessage[]>([])
  // 낙관적 말풍선의 임시 messageId. 서버 id(양수)와 겹치지 않게 음수를 감소시켜 부여한다.
  const tempMessageIdRef = React.useRef(-1)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [cameraMenuOpen, setCameraMenuOpen] = React.useState(false)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = React.useState(false)
  const [confirmDisbandOpen, setConfirmDisbandOpen] = React.useState(false)
  const [socketError, setSocketError] = React.useState<string | null>(null)

  const bottomRef = React.useRef<HTMLDivElement>(null)
  const topRef = React.useRef<HTMLDivElement>(null)
  // 카메라 촬영(capture)·앨범 선택용 숨김 file input. 카메라 메뉴 항목이 각각 트리거한다.
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const albumInputRef = React.useRef<HTMLInputElement>(null)
  const dateGroupRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  // 사용자가 하단 근처를 보고 있는지. 새 메시지 도착 시 이 값이 true일 때만 자동으로 맨 아래로 내린다.
  const isAtBottomRef = React.useRef(true)
  // 최초 진입 시 1회 맨 아래로 내렸는지.
  const didInitialScrollRef = React.useRef(false)
  // 과거 페이지 prepend 직전 scrollHeight. prepend 후 스크롤 위치 보정(anchor)에 쓴다.
  const prevScrollHeightRef = React.useRef<number | null>(null)
  const { isScrolling, onScroll: handleMessagesScroll } = useFadeScrollbar()

  const markReadMutation = useMarkRead()
  const setPinnedMutation = useSetPinned()
  const setNotifyMutation = useSetNotify()
  const leaveRoomMutation = useLeaveRoom()
  const disbandMeetingMutation = useDisbandMeeting()

  const chatMessages = React.useMemo(
    () => mergeMessages(initialMessages, liveMessages),
    [initialMessages, liveMessages]
  )

  const { connected, send } = useChatRoomSocket(session.activeRoomId, {
    onMessage: (event) => {
      if (myUserId < 0) return
      const incoming = adaptMessage(event, myUserId)
      setLiveMessages((prev) => {
        // 내 메시지 에코면, 먼저 그려둔 pending 낙관 말풍선 중 같은 내용 하나를 제거(대체)한다.
        // 서버가 clientNonce를 주지 않으므로 내용 일치로 가장 오래된 pending 항목을 매칭한다.
        if (incoming.sender === "me") {
          const idx = prev.findIndex((message) =>
            message.pending &&
            // 이미지 에코는 이미지 낙관 말풍선과, 텍스트 에코는 텍스트 낙관 말풍선과만 매칭한다.
            // ('사진' 텍스트 메시지가 이미지 에코와 오매칭되는 것을 방지)
            (incoming.imageUrl
              ? message.imageUploading
              : !message.imageUploading && message.texts[0] === incoming.texts[0])
          )
          if (idx !== -1) {
            return [...prev.slice(0, idx), ...prev.slice(idx + 1), incoming]
          }
        }
        return [...prev, incoming]
      })
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

  const meetingId = room?.roomType === "group" ? room.meetingId ?? undefined : undefined
  const { data: meeting } = useMeeting(meetingId ?? 0, meetingId != null)

  // 제목: group=모임 제목, question=질문 제목, direct=상대 닉네임. 도메인 제목이 오기 전엔 닉네임으로 폴백.
  const roomTitle = room
    ? room.roomType === "group" && meeting?.title
      ? meeting.title
      : room.roomType === "question" && questionSummary?.title
        ? questionSummary.title
        : resolveRoomTitle(room.members, myUserId, room.roomType)
    : ""
  const roomMembers = room?.members.map((member) => adaptMember(member, myUserId)) ?? []
  const notificationOn = room?.notifyEnabled ?? true
  const roomPinned = room?.pinned ?? false
  const isGroup = room?.roomType === "group"
  const isQuestionRoom = room?.roomType === "question"
  const roomAvatarSrc = isQuestionRoom
    ? questionSummary?.imageUrl
    : resolveChatRoomAvatar(
        room?.roomType ?? "direct",
        roomMembers,
        myUserId,
        resolveFileUrl(meeting?.imageUrl)
      )
  const isMeetingHost = isGroup && meeting?.host.userId === session.userId

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

  // 하단에서 이 거리(px) 이내면 "맨 아래를 보고 있다"고 본다.
  const AT_BOTTOM_THRESHOLD_PX = 80

  const updateIsAtBottom = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < AT_BOTTOM_THRESHOLD_PX
  }, [])

  const handleMessagesAreaScroll = () => {
    handleMessagesScroll()
    updateIsAtBottom()
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
      return
    }
    // 내가 보낸 메시지는 위로 스크롤 중이었더라도 항상 맨 아래로 따라 내려간다.
    isAtBottomRef.current = true
    // 낙관적 반영: 서버 에코를 기다리지 않고 내 말풍선을 즉시 표시한다.
    // 에코 도착 시 onMessage가 이 pending 항목을 서버 메시지로 대체한다.
    const nowIso = new Date().toISOString()
    const tempId = tempMessageIdRef.current
    tempMessageIdRef.current -= 1
    setLiveMessages((prev) => [
      ...prev,
      {
        id: `pending-${tempId}`,
        messageId: tempId,
        senderId: myUserId,
        sender: "me",
        variant: text.length > 30 ? "long" : "short",
        texts: [text],
        time: formatKstTime(nowIso),
        createdAt: nowIso,
        pending: true,
      },
    ])
  }

  // 카메라/앨범에서 고른 이미지를 presign 업로드 → imageFileId로 WS 전송한다.
  // 업로드는 비동기라, 먼저 로컬 미리보기로 낙관적 말풍선(업로드 중 스피너)을 그려두고
  // 성공 시 서버 에코가 대체, 실패 시 낙관적 말풍선을 제거하고 에러를 표시한다.
  const handleImageSelected = async (input: HTMLInputElement | null) => {
    const file = input?.files?.[0]
    if (input) input.value = ""
    if (!file || !session.authenticated) return

    const previewUrl = URL.createObjectURL(file)
    const nowIso = new Date().toISOString()
    const tempId = tempMessageIdRef.current
    tempMessageIdRef.current -= 1
    isAtBottomRef.current = true
    setLiveMessages((prev) => [
      ...prev,
      {
        id: `pending-${tempId}`,
        messageId: tempId,
        senderId: myUserId,
        sender: "me",
        variant: "short",
        texts: [""],
        imageUrl: previewUrl,
        imageUploading: true,
        time: formatKstTime(nowIso),
        createdAt: nowIso,
        pending: true,
      },
    ])

    try {
      const fileId = await uploadChatImage(file)
      if (!send({ imageFileId: fileId })) throw new Error("send failed")
    } catch {
      setLiveMessages((prev) => prev.filter((message) => message.messageId !== tempId))
      URL.revokeObjectURL(previewUrl)
      setSocketError(messages.chat.imageUploadFailed)
    }
  }

  const lastMessageId = chatMessages[chatMessages.length - 1]?.messageId

  // 자동 하단 스크롤: 최초 진입 시 1회, 이후엔 새 메시지가 도착했고(마지막 messageId 변화)
  // 사용자가 이미 하단 근처를 보고 있을 때만. 위로 스크롤해 과거를 보는 중엔 강제로 끌어내리지 않는다.
  React.useEffect(() => {
    if (chatMessages.length === 0) return
    if (!didInitialScrollRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" })
      didInitialScrollRef.current = true
      return
    }
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId])

  // 과거 페이지 prepend 후 스크롤 위치 보정: 늘어난 높이만큼 scrollTop을 더해 보던 위치를 유지한다.
  React.useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container || prevScrollHeightRef.current == null) return
    const diff = container.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = null
    if (diff > 0) container.scrollTop += diff
  }, [chatMessages])

  // 상단 도달 감지 → 과거 메시지 다음 페이지 로드. prepend 전 scrollHeight를 기록해 위치 보정에 쓴다.
  React.useEffect(() => {
    const container = scrollContainerRef.current
    const sentinel = topRef.current
    if (!container || !sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        // 최초 하단 정렬 전에는 상단 센티넬이 잠시 보일 수 있어, 초기 스크롤 완료 후에만 로드한다.
        if (!didInitialScrollRef.current) return
        if (!hasNextPage || isFetchingNextPage) return
        prevScrollHeightRef.current = container.scrollHeight
        fetchNextPage()
      },
      { root: container, rootMargin: "120px 0px 0px 0px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

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
      onClick: () => {
        setCameraMenuOpen(false)
        cameraInputRef.current?.click()
      },
    },
    {
      icon: <Image src="/icons/chat/image.svg" alt="" width={24} height={24} />,
      label: messages.chat.chooseAlbumAction,
      onClick: () => {
        setCameraMenuOpen(false)
        albumInputRef.current?.click()
      },
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
              {/* 상단 도달 감지 센티넬 + 과거 메시지 로딩 표시 */}
              <div ref={topRef} />
              {isFetchingNextPage && (
                <div className="flex justify-center py-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                </div>
              )}
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
                      avatarSrc={run.avatarSrc}
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
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handleImageSelected(event.currentTarget)}
          />
          <input
            ref={albumInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleImageSelected(event.currentTarget)}
          />
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
                  avatarSrc={roomAvatarSrc}
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
                    isMeetingHost && session.authenticated
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
          if (meetingId == null) return
          disbandMeetingMutation.mutate({ meetingId, roomId }, {
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
