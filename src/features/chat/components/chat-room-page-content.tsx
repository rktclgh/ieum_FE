"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Download, Globe } from "lucide-react"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Toast } from "@/components/ui/toast"
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
import { ChatSystemMessage } from "@/features/chat/components/chat-system-message"
import { ChatBubbleSegment, bubblePosition } from "@/features/chat/components/chat-bubble-segment"
import { ChatMessageGroup } from "@/features/chat/components/chat-message-group"
import {
  ChatMessageInput,
  type ChatMessageSendResult,
} from "@/features/chat/components/chat-message-input"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { ChatRoomMoreHeader } from "@/features/chat/components/chat-room-more-header"
import { ChatRoomProfile } from "@/features/chat/components/chat-room-profile"
import { ChatRoomInfoSection } from "@/features/chat/components/chat-room-info-section"
import { ChatRoomMemberItem } from "@/features/chat/components/chat-room-member-item"
import { ChatRoomDangerActions } from "@/features/chat/components/chat-room-danger-actions"
import { SectionTitle } from "@/features/chat/components/section-title"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useSaveImage } from "@/lib/hooks/use-save-image"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_LIFT_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
import {
  chatKeys,
  useChatMessages,
  useChatRoom,
  useChatSessionAccess,
  usePinnedRoomId,
} from "@/features/chat/hooks/use-chat-queries"
import {
  useDisbandMeeting,
  useLeaveChatRoom,
  useMarkRead,
  useSetNotify,
  useSetPinned,
} from "@/features/chat/hooks/use-chat-mutations"
import type { ChatReplyPreview, LeaveChatRoomTarget } from "@/features/chat/api/chat-types"
import {
  isActiveRoomRemoval,
  removeRoomFromAllLoadedListCaches,
} from "@/features/chat/lib/chat-room-event"
import { useChatRoomSocket } from "@/features/chat/lib/chat-socket"
import { uploadChatImage } from "@/features/chat/api/chat-file-api"
import {
  adaptMember,
  adaptMessage,
  resolveRoomTitle,
  type ChatBubbleMessage,
  type ChatMessageView,
} from "@/features/chat/lib/chat-adapter"
import { resolveChatRoomAvatars } from "@/features/chat/lib/chat-avatar"
import {
  buildGroupChatMemberList,
  type GroupChatMemberListItem,
} from "@/features/chat/lib/chat-member-management"
import { buildChatTimeline, dedupeServerMessages } from "@/features/chat/lib/chat-timeline"
import {
  canReplyToMessage,
  findConfirmedReplyPendingFromHistory,
  findPendingEchoMatch,
  formatReplyLabel,
  hasUnconfirmedReplyPendingForEcho,
  replyTargetFromMessage,
  shouldClearDraftAfterAcceptedEcho,
  shouldClearSelectedReplyAfterAcceptedEcho,
} from "@/features/chat/lib/chat-reply"
import type { ChatSessionAccess } from "@/features/chat/lib/chat-session"
import { useKickMember } from "@/features/meetup/hooks/use-meetup-mutations"
import { meetupKeys, useMeeting, useMeetingParticipants } from "@/features/meetup/hooks/use-meetup-queries"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useQuestionSummary } from "@/features/question/hooks/use-question-queries"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { resolveFileUrl } from "@/lib/api/file-url"
import { useFadeScrollbar, FADE_SCROLLBAR_CLASSNAME } from "@/lib/hooks/use-fade-scrollbar"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
  getKstDateKey,
  formatKstFullDate,
  formatKstShortDate,
  formatKstTime,
  getKstMinuteKey,
} from "@/lib/date/kst"
import { routes } from "@/lib/navigation/routes"
import { cn } from "@/lib/utils"

// spaceBelow 를 window.innerHeight 기준으로 재는데 하단 입력창이 그 위를 덮으므로,
// 입력창(약 81px)에 여유를 더한 값을 빼줘야 메뉴가 입력창에 가려지지 않는다. (Figma 1406:6346)
const MESSAGE_BOTTOM_SAFE_AREA = 112
// 낙관적 말풍선을 서버 메시지와 같은 것으로 볼 시간 창(에코를 놓쳐 백필로 들어온 경우 매칭용).
const PENDING_MATCH_WINDOW_MS = 60_000
// 자동 하단 스크롤이 만든 scroll 이벤트를 사용자 스크롤과 구분하기 위한 시간 창.
const PROGRAMMATIC_SCROLL_QUIET_MS = 250

interface MessageRowProps {
  message: ChatBubbleMessage
  position: "solo" | "first" | "middle" | "last"
  isAuthenticated: boolean
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function MessageRow({
  message,
  position,
  isAuthenticated,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
}: MessageRowProps) {
  const { messages } = useTranslation()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const isMe = message.sender === "me"
  const replyLabel = message.replyTo
    ? formatReplyLabel(message, message.replyTo, {
        mine: messages.chat.replyToLabel,
        others: messages.chat.replyFromToLabel,
      })
    : undefined
  const replyQuote = message.replyTo
    ? message.replyTo.content?.trim() || messages.chat.replyImageLabel
    : undefined

  // 낙관적(pending) 말풍선은 아직 서버 메시지 ID가 없어 번역 대상에서 제외한다.
  const text = message.texts[0]
  const translate = useTranslateToggle({ text: text ?? "", isAuthenticated })
  const canTranslate = isAuthenticated && !message.pending && message.hasText && translate.canTranslate

  const fullMenuItems: ChatContextMenuItem[] = canTranslate
    ? [
        {
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
        },
        ...menuItems,
      ]
    : menuItems

  // 번역 항목이 조건부라 메뉴 높이가 152↔196 으로 변하므로 실제 항목 수로 계산한다.
  const handleOpenMenu = () => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setPlacement(
        spaceBelow < contextMenuHeight(fullMenuItems.length) + MESSAGE_BOTTOM_SAFE_AREA ? "top" : "bottom"
      )
    }
    onOpenMenu()
  }

  const longPress = useLongPress({ onLongPress: handleOpenMenu })

  return (
    <div ref={rowRef} className="relative" {...longPress}>
      <ChatBubbleSegment
        sender={message.sender}
        text={translate.displayText}
        imageUrl={message.imageUrl}
        imageAlt={messages.chat.imageAlt}
        uploading={message.imageUploading}
        replyLabel={replyLabel}
        replyQuote={replyQuote}
        replyImageUrl={message.replyTo?.imageUrl}
        replyImageAlt={messages.chat.replyImageLabel}
        position={position}
        variant={message.variant}
        className={cn(
          LONG_PRESS_TRANSITION,
          // 말풍선은 배경색·라운드가 고유하므로 기준의 흰 카드 표면은 빼고 리프트만 맞춘다.
          menuOpen ? LONG_PRESS_LIFT_ACTIVE : LONG_PRESS_INACTIVE
        )}
      />
      {translate.isError ? (
        <p className={cn("mt-1 text-body-regular-12 text-red", isMe ? "text-right" : "text-left")}>
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {menuOpen && (
        <ChatContextMenu
          items={fullMenuItems}
          dimmed
          onDismiss={onCloseMenu}
          className={cn(
            isMe ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-5" : "top-full mt-3"
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
function mergeMessages(base: ChatMessageView[], live: ChatMessageView[]): ChatMessageView[] {
  const server = dedupeServerMessages(
    // 같은 messageId의 재조회 결과는 WS의 구버전 payload보다 상세한 replyTo를 보존한다.
    [...live, ...base].filter((message) => message.messageType !== "user" || !message.pending)
  )

  const pendings = live
    .filter((message): message is ChatBubbleMessage => message.messageType === "user" && Boolean(message.pending))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.messageId - b.messageId))
  const remainingPending = new Map(pendings.map((pending) => [pending.messageId, pending]))
  for (const message of server) {
    if (message.messageType !== "user" || message.sender !== "me") continue
    const match = findPendingEchoMatch(
      [...remainingPending.values()],
      message,
      PENDING_MATCH_WINDOW_MS
    )
    if (match) remainingPending.delete(match.messageId)
  }

  return [...server, ...remainingPending.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.messageId - b.messageId
  })
}

function ChatRoomSessionContent({ roomId, session }: ChatRoomSessionContentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { messages } = useTranslation()
  const myUserId = session.userId ?? -1
  const saveImageAction = useSaveImage()

  const { data: room } = useChatRoom(roomId, session)
  const {
    messages: initialMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(roomId, session)

  const [liveMessages, setLiveMessages] = React.useState<ChatMessageView[]>([])
  const liveMessagesRef = React.useRef<ChatMessageView[]>([])
  const updateLiveMessages = React.useCallback(
    (updater: (previous: ChatMessageView[]) => ChatMessageView[]) => {
      const next = updater(liveMessagesRef.current)
      liveMessagesRef.current = next
      setLiveMessages(next)
    },
    []
  )
  // 낙관적 말풍선의 임시 messageId. 서버 id(양수)와 겹치지 않게 음수를 감소시켜 부여한다.
  const tempMessageIdRef = React.useRef(-1)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)
  const [selectedReply, setSelectedReply] = React.useState<ChatReplyPreview | null>(null)
  const [messageDraft, setMessageDraft] = React.useState("")
  const [confirmLeaveOpen, setConfirmLeaveOpen] = React.useState(false)
  const [confirmDisbandOpen, setConfirmDisbandOpen] = React.useState(false)
  const [kickTarget, setKickTarget] = React.useState<GroupChatMemberListItem | null>(null)
  const [socketError, setSocketError] = React.useState<string | null>(null)

  // 구 WS 이벤트가 replyTo를 생략하면 REST snapshot의 명시적 링크로만 답장 전송을 확정한다.
  React.useEffect(() => {
    const pendingMessages = liveMessagesRef.current.filter(
      (message): message is ChatBubbleMessage => message.messageType === "user" && Boolean(message.pending)
    )
    const matchedPending = findConfirmedReplyPendingFromHistory(
      pendingMessages,
      initialMessages,
      PENDING_MATCH_WINDOW_MS
    )
    if (!matchedPending) return

    updateLiveMessages((previous) => previous.filter((message) => message.messageId !== matchedPending.messageId))
    setSelectedReply((current) =>
      shouldClearSelectedReplyAfterAcceptedEcho(current, matchedPending) ? null : current
    )
    setMessageDraft((current) =>
      shouldClearDraftAfterAcceptedEcho(current, matchedPending) ? "" : current
    )
  }, [initialMessages, updateLiveMessages])

  const bottomRef = React.useRef<HTMLDivElement>(null)
  const topRef = React.useRef<HTMLDivElement>(null)
  // 카메라 촬영(capture)·앨범 선택용 숨김 file input. 카메라 메뉴 항목이 각각 트리거한다.
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dateGroupRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  // 사용자가 하단 근처를 보고 있는지. 새 메시지 도착 시 이 값이 true일 때만 자동으로 맨 아래로 내린다.
  const isAtBottomRef = React.useRef(true)
  // 최초 진입 시 1회 맨 아래로 내렸는지.
  const didInitialScrollRef = React.useRef(false)
  // 과거 페이지 prepend 직전 scrollHeight. prepend 후 스크롤 위치 보정(anchor)에 쓴다.
  const prevScrollHeightRef = React.useRef<number | null>(null)
  const { isScrolling, onScroll: handleMessagesScroll } = useFadeScrollbar()
  // 자동 하단 스크롤이 발생시킨 scroll 이벤트가 스크롤바·날짜 뱃지를 띄우지 않도록,
  // 프로그램적 스크롤 직후 이 시간(ms) 동안은 페이드 스크롤바 트리거를 무시한다.
  const programmaticScrollQuietUntilRef = React.useRef(0)

  const scrollToBottom = React.useCallback(() => {
    // 스크롤이 실제로 일어나지 않는데 무시 창을 열면 직후의 사용자 스크롤이 삼켜진다.
    if (!bottomRef.current) return
    programmaticScrollQuietUntilRef.current = performance.now() + PROGRAMMATIC_SCROLL_QUIET_MS
    bottomRef.current.scrollIntoView({ block: "end" })
  }, [])

  const markReadMutation = useMarkRead()
  const { pinnedRoomId, isLoading: isPinnedRoomLoading } = usePinnedRoomId()
  const [confirmPinReplaceOpen, setConfirmPinReplaceOpen] = React.useState(false)
  const setPinnedMutation = useSetPinned()
  const setNotifyMutation = useSetNotify()
  const leaveChatRoomMutation = useLeaveChatRoom()
  const disbandMeetingMutation = useDisbandMeeting()

  const isGroup = room?.roomType === "group"
  const isQuestionRoom = room?.roomType === "question"
  const questionId = isQuestionRoom ? room?.questionId ?? undefined : undefined
  const { data: questionSummary } = useQuestionSummary(questionId ?? 0, questionId != null)
  const meetingId = isGroup ? room?.meetingId ?? undefined : undefined
  const { data: meeting } = useMeeting(meetingId ?? 0, meetingId != null)
  const participantQueryEnabled = session.authenticated && moreOpen && isGroup && meetingId != null
  const {
    data: meetingParticipants,
    isLoading: isMeetingParticipantsLoading,
    isError: isMeetingParticipantsError,
    error: meetingParticipantsError,
  } = useMeetingParticipants(meetingId ?? 0, participantQueryEnabled)
  const kickMemberMutation = useKickMember(meetingId ?? 0)

  const chatMessages = React.useMemo(
    () => mergeMessages(initialMessages, liveMessages),
    [initialMessages, liveMessages]
  )

  const { connected, send } = useChatRoomSocket(session.activeRoomId, {
    onMessage: (event) => {
      if (myUserId < 0) return
      const incoming = adaptMessage(event, myUserId)
      const pendingMessages = liveMessagesRef.current.filter(
        (message): message is ChatBubbleMessage => message.messageType === "user" && Boolean(message.pending)
      )
      const matchedPending =
        incoming.messageType === "user" && incoming.sender === "me"
          ? findPendingEchoMatch(pendingMessages, incoming, PENDING_MATCH_WINDOW_MS)
          : undefined
      const needsReplyHistoryBackfill =
        incoming.messageType === "user" &&
        incoming.sender === "me" &&
        hasUnconfirmedReplyPendingForEcho(pendingMessages, incoming, PENDING_MATCH_WINDOW_MS)

      updateLiveMessages((previous) =>
        matchedPending
          ? [...previous.filter((message) => message.messageId !== matchedPending.messageId), incoming]
          : [...previous, incoming]
      )

      if (matchedPending?.replyTo) {
        setSelectedReply((current) =>
          shouldClearSelectedReplyAfterAcceptedEcho(current, matchedPending) ? null : current
        )
        setMessageDraft((current) =>
          shouldClearDraftAfterAcceptedEcho(current, matchedPending) ? "" : current
        )
      }
      if (needsReplyHistoryBackfill) {
        // 구 이벤트 형식에는 replyTo가 없을 수 있다. 확정 링크가 보이는 REST snapshot을 다시 읽는다.
        queryClient.invalidateQueries({ queryKey: chatKeys.messages(roomId) })
      }
      // 새 메시지 수신 → 채팅 목록(미리보기·안읽음) 캐시를 무효화해 목록 재진입 시 최신 상태로 갱신한다.
      queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "rooms"] })
      if (incoming.messageType === "system" && isGroup && meetingId != null) {
        queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) })
        queryClient.invalidateQueries({ queryKey: meetupKeys.participants(meetingId) })
      }
    },
    onRoomEvent: (event) => {
      if (!isActiveRoomRemoval(event, session.activeRoomId)) return
      removeRoomFromAllLoadedListCaches(queryClient, [...chatKeys.all, "rooms"], roomId)
      if (isGroup && meetingId != null) {
        queryClient.removeQueries({ queryKey: meetupKeys.detail(meetingId) })
        queryClient.removeQueries({ queryKey: meetupKeys.participants(meetingId) })
      }
      // 서버가 보낸 remove는 이 방의 접근권이 이미 제거됐다는 확정 신호다.
      // HTTP mutation의 응답 순서와 무관하게 즉시 열린 방을 정리하고 이동한다.
      queryClient.removeQueries({ queryKey: chatKeys.room(roomId) })
      queryClient.removeQueries({ queryKey: chatKeys.messages(roomId) })
      updateLiveMessages(() => [])
      setMoreOpen(false)
      setActiveMessageId(null)
      setSelectedReply(null)
      setConfirmLeaveOpen(false)
      setConfirmDisbandOpen(false)
      setKickTarget(null)
      router.replace(routes.chats())
    },
    onError: (error) => {
      // 답장 target과 초안은 서버가 수락한 에코에서만 정리한다. 오류 시에는 재시도할 수 있게 유지한다.
      setSocketError(error.message)
    },
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

  // 제목: group=모임 제목, question=질문 제목, direct=상대 닉네임. 도메인 제목이 오기 전엔 닉네임으로 폴백.
  const roomTitle = room
    ? room.roomType === "group" && meeting?.title
      ? meeting.title
      : room.roomType === "question" && questionSummary?.title
        ? questionSummary.title
        : resolveRoomTitle(room.members, myUserId, room.roomType)
    : ""
  const roomMembers = React.useMemo(
    () => room?.members.map((member) => adaptMember(member, myUserId)) ?? [],
    [room?.members, myUserId]
  )
  const counterpart = room?.counterpart ? adaptMember(room.counterpart, myUserId) : undefined
  const groupMembers = React.useMemo(
    () =>
      buildGroupChatMemberList({
        currentUserId: myUserId,
        participants: meetingParticipants ?? [],
        roomMembers,
      }),
    [meetingParticipants, myUserId, roomMembers]
  )
  const notificationOn = room?.notifyEnabled ?? true
  const roomPinned = room?.pinned ?? false
  const roomAvatars = resolveChatRoomAvatars(
    room?.roomType ?? "direct",
    roomMembers,
    myUserId,
    resolveFileUrl(meeting?.imageUrl),
    counterpart
  )
  const isMeetingHost = isGroup && meeting?.host.userId === session.userId
  const canConfigureRoomNotification = room !== undefined
  const canPinRoom = room !== undefined && room.roomType !== "question"
  // room 응답에 있는 도메인 식별자를 그대로 보존한다. group은 meetingId가 없어도
  // generic leave로 폴백하지 않고 mutation의 typed local failure로 끝난다.
  const leaveTarget: LeaveChatRoomTarget | null = room
    ? { roomId: room.roomId, roomType: room.roomType, meetingId: room.meetingId }
    : null

  // 메시지를 한국 날짜(KST) 단위로 묶어서 날짜가 바뀔 때마다 구분선을 표시한다.
  const dateGroups = React.useMemo(() => {
    const groups: { dateKey: string; label: string; messages: ChatMessageView[] }[] = []
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
    // 사용자가 직접 스크롤할 때만 스크롤바·날짜 뱃지를 띄운다.
    if (performance.now() >= programmaticScrollQuietUntilRef.current) handleMessagesScroll()
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

  const handleSend = (value: string): ChatMessageSendResult => {
    if (!session.authenticated) return "failed"
    const text = value.trim()
    if (!text) return "failed"
    const replyTo = selectedReply
    // 서버 echo가 publish 직후 도착해도 매칭할 수 있게 pending을 먼저 추가한다.
    const nowIso = new Date().toISOString()
    const tempId = tempMessageIdRef.current
    tempMessageIdRef.current -= 1
    const pending: ChatBubbleMessage = {
      messageType: "user",
      id: `pending-${tempId}`,
      messageId: tempId,
      senderId: myUserId,
      sender: "me",
      variant: text.length > 30 ? "long" : "short",
      texts: [text],
      replyTo,
      time: formatKstTime(nowIso),
      createdAt: nowIso,
      pending: true,
      hasText: true,
    }
    updateLiveMessages((previous) => [
      ...previous,
      pending,
    ])
    if (!send({ content: text, ...(replyTo ? { replyToMessageId: replyTo.messageId } : {}) })) {
      updateLiveMessages((previous) => previous.filter((message) => message.messageId !== tempId))
      setSocketError(messages.chat.sendFailed)
      return "failed"
    }
    // 내가 보낸 메시지는 위로 스크롤 중이었더라도 항상 맨 아래로 따라 내려간다.
    isAtBottomRef.current = true
    // 일반 메시지는 바로 초안을 비우되, 답장은 수락 echo가 도착할 때까지 target과 초안을 유지한다.
    return replyTo ? "awaiting-echo" : "published"
  }

  // 카메라/앨범에서 고른 이미지를 presign 업로드 → imageFileId로 WS 전송한다.
  // 업로드는 비동기라, 먼저 로컬 미리보기로 낙관적 말풍선(업로드 중 스피너)을 그려두고
  // 성공 시 서버 에코가 대체, 실패 시 낙관적 말풍선을 제거하고 에러를 표시한다.
  const handleImageSelected = async (input: HTMLInputElement | null) => {
    const file = input?.files?.[0]
    if (input) input.value = ""
    if (!file || !session.authenticated) return

    const previewUrl = URL.createObjectURL(file)
    const replyTo = selectedReply
    const nowIso = new Date().toISOString()
    const tempId = tempMessageIdRef.current
    tempMessageIdRef.current -= 1
    isAtBottomRef.current = true
    const pending: ChatBubbleMessage = {
      messageType: "user",
      id: `pending-${tempId}`,
      messageId: tempId,
      senderId: myUserId,
      sender: "me",
      variant: "short",
      texts: [""],
      imageUrl: previewUrl,
      imageUploading: true,
      replyTo,
      time: formatKstTime(nowIso),
      createdAt: nowIso,
      pending: true,
      hasText: false,
    }
    updateLiveMessages((previous) => [
      ...previous,
      pending,
    ])

    try {
      const fileId = await uploadChatImage(file)
      // 아직 업로드 중인 이미지 pending은 다른 이미지 echo와 대체하지 않는다.
      updateLiveMessages((previous) =>
        previous.map((message) =>
          message.messageId === tempId ? { ...message, imageUploading: false } : message
        )
      )
      if (!send({ imageFileId: fileId, ...(replyTo ? { replyToMessageId: replyTo.messageId } : {}) })) {
        throw new Error("send failed")
      }
    } catch {
      updateLiveMessages((previous) => previous.filter((message) => message.messageId !== tempId))
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
      scrollToBottom()
      didInitialScrollRef.current = true
      return
    }
    if (isAtBottomRef.current) {
      scrollToBottom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessageId])

  // 키보드가 열리면 main의 padding-bottom(--keyboard-inset)이 늘어나 이 스크롤 영역도 함께 압축된다.
  // 하단을 보고 있었다면 그대로 두면 최신 메시지가 화면 밖으로 밀리므로, 크기 변화에 맞춰 다시 내린다.
  // (scrollToBottom은 프로그램적 스크롤 무시 창을 열어 스크롤바·날짜 뱃지가 깜빡이지 않게 한다 — #277)
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) scrollToBottom()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [scrollToBottom])

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
    const items: ChatContextMenuItem[] = []
    if (canReplyToMessage(message)) {
      items.push({
        icon: <Image src="/icons/chat/respond.svg" alt="" width={24} height={24} />,
        label: messages.chat.replyAction,
        onClick: () => {
          setSelectedReply(replyTargetFromMessage(message))
          setActiveMessageId(null)
        },
      })
    }
    // 업로드 중인 낙관적 말풍선은 blob: 미리보기라 저장 대상이 아니다.
    if (message.imageUrl && !message.imageUploading) {
      const imageUrl = message.imageUrl
      items.push({
        icon: <Download className="size-6 text-gray-900" />,
        label: messages.common.saveImage,
        onClick: () => {
          setActiveMessageId(null)
          void saveImageAction.save(imageUrl)
        },
      })
    }
    items.push(
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
    )
    return items
  }

  return (
    <>
      {/* app-viewport-height(height: 100dvh - keyboard-inset) 대신 fixed + padding-bottom을
          쓴다. iOS 키보드 위 입력 액세서리 바는 visualViewport 리사이즈에 잡히지 않아
          --keyboard-inset이 항상 그 높이만큼 부족한데(full-screen-overlay.tsx 참고, issue #328),
          박스 자체 높이를 줄이는 방식은 그 부족분이 입력창과 키보드 사이 빈 틈으로 그대로
          노출된다. 박스를 화면 전체에 고정하고 padding-bottom만 줄이면 배경이 끝까지 채워져
          같은 부족분이 여백으로 드러나지 않는다. */}
      <main className="fixed inset-0 app-column flex flex-col bg-white pb-[var(--keyboard-inset,0px)]">
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
              <div className="sticky top-0 z-50 -mx-4 bg-white px-4 pt-2 pb-1">
                <NoticeBanner
                  text={notice}
                  isAuthenticated={session.authenticated}
                  onClose={() => setNotice(null)}
                />
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
                  {buildChatTimeline(group.messages, getKstMinuteKey).map((item) => {
                    if (item.kind === "system") {
                      return <ChatSystemMessage key={item.message.id} content={item.message.content} />
                    }

                    return (
                      <ChatMessageGroup
                        key={item.runKey}
                        sender={item.sender}
                        name={item.name}
                        time={item.time}
                        avatarSrc={item.avatarSrc}
                      >
                        {item.messages.map((message, index) => (
                          <MessageRow
                            key={message.id}
                            message={message}
                            position={bubblePosition(index, item.messages.length)}
                            isAuthenticated={session.authenticated}
                            menuOpen={activeMessageId === message.id}
                            menuItems={messageMenuItems(message)}
                            onOpenMenu={() => setActiveMessageId(message.id)}
                            onCloseMenu={() => setActiveMessageId(null)}
                          />
                        ))}
                      </ChatMessageGroup>
                    )
                  })}
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
        <div className="relative px-4 pt-2 pb-[calc(1rem+var(--safe-area-bottom))]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleImageSelected(event.currentTarget)}
          />
          <ChatMessageInput
            disabled={!session.authenticated}
            value={messageDraft}
            onChange={setMessageDraft}
            onSend={handleSend}
            onCameraClick={() => fileInputRef.current?.click()}
            replyPreview={
              selectedReply
                ? {
                    messageId: selectedReply.messageId,
                    label: messages.chat.replyToLabel(selectedReply.senderNickname),
                    quote: selectedReply.content?.trim() || messages.chat.replyImageLabel,
                    imageUrl: selectedReply.imageUrl,
                  }
                : null
            }
            onCancelReply={() => setSelectedReply(null)}
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
                showNotificationAction={canConfigureRoomNotification}
                showPinAction={canPinRoom}
                notificationPending={setNotifyMutation.isPending}
                pinPending={setPinnedMutation.isPending || isPinnedRoomLoading}
                notificationOn={notificationOn}
                onToggleNotification={() => {
                  if (!session.authenticated || !canConfigureRoomNotification || setNotifyMutation.isPending) return
                  setNotifyMutation.mutate({ roomId, enabled: !notificationOn })
                }}
                pinned={roomPinned}
                onTogglePin={() => {
                  if (!session.authenticated || !canPinRoom || setPinnedMutation.isPending) return
                  // 방 목록이 아직 없으면 기존 고정 방을 알 수 없다. 그대로 진행하면 교체 확인을
                  // 건너뛰고 두 방이 고정되므로, 목록이 도착할 때까지 고정을 막는다.
                  if (isPinnedRoomLoading) return
                  // 다른 방이 이미 고정돼 있으면 교체 확인을 먼저 받는다(고정은 전체 1개)
                  if (!roomPinned && pinnedRoomId !== undefined && pinnedRoomId !== roomId) {
                    setConfirmPinReplaceOpen(true)
                    return
                  }
                  setPinnedMutation.mutate(
                    { roomId, pinned: !roomPinned },
                    { onError: () => setSocketError(messages.chat.pinFailed) }
                  )
                }}
              />
              <SidePanelContent className="items-center gap-3 px-4 pb-[calc(1.5rem+var(--safe-area-bottom))]">
                <ChatRoomProfile
                  title={roomTitle}
                  avatarSrc={roomAvatars.avatarSrc}
                  secondaryAvatarSrc={roomAvatars.secondaryAvatarSrc}
                  grouped={roomAvatars.grouped}
                />
                {!isQuestionRoom && (
                  <ChatRoomInfoSection
                    className="w-full"
                    onNoticeClick={() => router.push(routes.chatNotices(roomId))}
                    onScheduleClick={() => router.push(routes.chatSchedule(roomId))}
                  />
                )}
                <div className="flex w-full flex-col rounded-2xl bg-gray-50 py-3">
                  <SectionTitle
                    title={messages.chat.membersTitle}
                    count={isGroup ? groupMembers.length : roomMembers.length}
                    padding="12"
                  />
                  {isGroup ? (
                    isMeetingParticipantsLoading ? (
                      <div className="flex justify-center p-4">
                        <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                      </div>
                    ) : isMeetingParticipantsError ? (
                      <p className="px-3 pb-3 text-body-regular-13 text-red-500">
                        {getMeetupErrorMessage(meetingParticipantsError, messages)}
                      </p>
                    ) : (
                      groupMembers.map((member) => (
                        <ChatRoomMemberItem
                          key={member.userId}
                          name={member.name}
                          avatarSrc={resolveFileUrl(member.profileImageUrl)}
                          isMe={member.isMe}
                          isOwner={member.isOwner}
                          flagSrc={member.countryFlagSrc}
                          nation={member.nationalityCode ? messages.countries[member.nationalityCode] : undefined}
                          onRemove={
                            member.canRemove
                              ? () => {
                                  if (kickMemberMutation.isPending) return
                                  setSocketError(null)
                                  setKickTarget(member)
                                }
                              : undefined
                          }
                          disabled={kickMemberMutation.isPending}
                          removeLabel={messages.meetup.kickButton}
                        />
                      ))
                    )
                  ) : (
                    roomMembers.map((member) => (
                      <ChatRoomMemberItem
                        key={member.userId}
                        name={member.name}
                        avatarSrc={member.avatarSrc}
                        isMe={member.isMe}
                        flagSrc={member.countryFlagSrc}
                        nation={member.nationalityCode ? messages.countries[member.nationalityCode] : undefined}
                      />
                    ))
                  )}
                </div>
                <ChatRoomDangerActions
                  className="w-full"
                  leaveLabel={isGroup ? messages.meetup.leaveButton : undefined}
                  // 방장은 '나가기' 숨김(해체만) — 주인 없는 방 방지. 그 외(멤버·1:1)만 나가기 노출.
                  // 그룹방 meeting 로딩 중에는 방장 판별 전이라 나가기도 숨긴다(방장에게 잠깐 노출되는 결함 방지).
                  onLeave={
                    (isGroup && !meeting) || isMeetingHost
                      ? undefined
                      : () => {
                          if (session.authenticated) setConfirmLeaveOpen(true)
                        }
                  }
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
        title={isGroup ? messages.meetup.leaveConfirmTitle : messages.chat.leaveChatConfirmTitle}
        description={isGroup ? messages.meetup.leaveConfirmDescription : messages.chat.leaveChatConfirmDescription}
        cancelLabel={isGroup ? messages.meetup.confirmCancelLabel : messages.chat.cancelButton}
        confirmLabel={isGroup ? messages.meetup.leaveButton : messages.chat.leaveChatAction}
        confirmDisabled={leaveChatRoomMutation.isPending || leaveTarget === null}
        onConfirm={() => {
          if (!session.authenticated || !leaveTarget) return
          leaveChatRoomMutation.mutate(leaveTarget, {
            onSuccess: () => router.push(routes.chats()),
            onError: (error) => {
              setSocketError(
                leaveTarget.roomType === "group"
                  ? getMeetupErrorMessage(error, messages)
                  : messages.chat.leaveFailed
              )
            },
          })
        }}
      />
      <ConfirmDialog
        open={session.authenticated && confirmPinReplaceOpen}
        onOpenChange={(open) => {
          if (session.authenticated) setConfirmPinReplaceOpen(open)
        }}
        title={messages.chat.pinReplaceConfirmTitle}
        description={messages.chat.pinReplaceConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.pinReplaceConfirmButton}
        confirmDisabled={setPinnedMutation.isPending}
        onConfirm={() => {
          if (!session.authenticated || setPinnedMutation.isPending) return
          setPinnedMutation.mutate(
            { roomId, pinned: true, replacingRoomId: pinnedRoomId },
            { onError: () => setSocketError(messages.chat.pinFailed) }
          )
          setConfirmPinReplaceOpen(false)
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
      <ConfirmDialog
        open={session.authenticated && kickTarget !== null}
        onOpenChange={(open) => {
          if (!session.authenticated || kickMemberMutation.isPending || open) return
          setKickTarget(null)
        }}
        title={messages.meetup.kickConfirmTitle}
        description={messages.meetup.kickConfirmDescription}
        cancelLabel={messages.meetup.confirmCancelLabel}
        confirmLabel={messages.meetup.kickButton}
        confirmDisabled={kickMemberMutation.isPending || kickTarget === null || meetingId == null}
        onConfirm={() => {
          if (!session.authenticated || !kickTarget || meetingId == null || kickMemberMutation.isPending) return
          kickMemberMutation.mutate(kickTarget.userId, {
            onSuccess: () => {
              setKickTarget(null)
              queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) })
            },
            onError: (error) => setSocketError(getMeetupErrorMessage(error, messages)),
          })
        }}
      />
      <Toast open={saveImageAction.failed} message={messages.common.saveImageFailed} />
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
