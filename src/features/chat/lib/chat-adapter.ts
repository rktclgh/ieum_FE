import { resolveFileUrl } from "@/lib/api/file-url"
import { formatKstTime } from "@/lib/date/kst"
import type { ChatFilterCategory } from "@/features/chat/components/chat-filter-chips"
import { resolveChatRoomAvatar } from "@/features/chat/lib/chat-avatar"
import type {
  ChatMessageResponse,
  ChatReplyPreview,
  ChatRoomDetailResponse,
  ChatRoomMemberResponse,
  ChatRoomSummaryResponse,
  RoomType,
  WsMessageEvent,
} from "@/features/chat/api/chat-types"
import { flagFromIso2, fromIso2 } from "@/features/join/lib/nationality-map"
import type { CountryCode } from "@/lib/constants/countries"
import { normalizeMessageType } from "@/features/chat/lib/chat-timeline"

// 목록/방 UI가 공통으로 쓰는 뷰 모델.

interface ChatListEntry {
  roomId: number
  roomType: RoomType
  meetingId: number | null
  title: string
  category: Exclude<ChatFilterCategory, "all">
  avatarSrc?: string
  memberCount?: number
  lastMessage?: string
  time?: string
  unreadCount?: number
  pinned: boolean
  notifyEnabled: boolean
}

interface ChatBubbleMessage {
  messageType: "user"
  id: string
  messageId: number
  senderId: number
  sender: "me" | "others"
  variant: "long" | "short"
  name?: string
  avatarSrc?: string
  texts: string[]
  imageUrl?: string
  time: string
  createdAt: string
  // 낙관적으로 먼저 그린 내 말풍선(서버 에코 전). 에코 도착 시 대체된다.
  pending?: boolean
  // 이미지 업로드/전송 진행 중인 낙관적 이미지 말풍선. 흐리게 + 스피너로 표시한다.
  imageUploading?: boolean
  replyTo?: ChatReplyPreview | null
}

type ChatUserBubbleMessage = ChatBubbleMessage

interface ChatSystemMessage {
  messageType: "system"
  id: string
  messageId: number
  content: string
  createdAt: string
}

type ChatMessageView = ChatUserBubbleMessage | ChatSystemMessage

interface ChatMemberEntry {
  userId: number
  name: string
  avatarSrc?: string
  isMe: boolean
  countryFlagSrc?: string
  nationalityCode?: CountryCode
}

// roomType → 필터/목록 카테고리. direct=friend(1:1), group=meetup(모임), question=question.
function roomCategory(roomType: RoomType): Exclude<ChatFilterCategory, "all"> {
  if (roomType === "group") return "meetup"
  if (roomType === "question") return "question"
  return "friend"
}

// 방 제목: 백엔드 summary엔 제목이 없어 members에서 파생한다.
// - direct: 나를 제외한 상대의 닉네임
// - group/question: 상대 닉네임들을 결합("A, B 외 2명")
function resolveRoomTitle(members: ChatRoomMemberResponse[], myUserId: number, roomType: RoomType): string {
  const others = members.filter((member) => member.userId !== myUserId)
  if (others.length === 0) return roomType === "direct" ? "알 수 없음" : "채팅방"
  if (roomType === "direct") return others[0].nickname
  const names = others.slice(0, 2).map((member) => member.nickname).join(", ")
  return others.length > 2 ? `${names} 외 ${others.length - 2}명` : names
}

function resolveRoomAvatar(
  members: ChatRoomMemberResponse[],
  myUserId: number,
  roomType: RoomType,
  meetingImageUrl?: string | null,
  counterpart?: ChatRoomMemberResponse | null
): string | undefined {
  if (roomType === "group") return resolveFileUrl(meetingImageUrl)
  return resolveChatRoomAvatar(
    roomType,
    members.map((member) => ({
      userId: member.userId,
      avatarSrc: resolveFileUrl(member.profileImageUrl),
    })),
    myUserId,
    undefined,
    counterpart
      ? {
          userId: counterpart.userId,
          avatarSrc: resolveFileUrl(counterpart.profileImageUrl),
        }
      : undefined
  )
}

// summary + detail(제목 파생용)을 목록 항목으로 합친다.
// domainTitle: group=모임 제목, question=질문 제목(연결 도메인에서 조회). 있으면 닉네임 파생보다 우선한다.
function adaptRoomSummary(
  summary: ChatRoomSummaryResponse,
  detail: ChatRoomDetailResponse | undefined,
  myUserId: number,
  domainTitle?: string,
  meetingImageUrl?: string | null
): ChatListEntry {
  const members = detail?.members ?? []
  const last = summary.lastMessage
  const title =
    summary.roomType !== "direct" && domainTitle
      ? domainTitle
      : detail
        ? resolveRoomTitle(members, myUserId, summary.roomType)
        : `채팅방 ${summary.roomId}`
  return {
    roomId: summary.roomId,
    roomType: summary.roomType,
    meetingId: summary.meetingId,
    title,
    category: roomCategory(summary.roomType),
    avatarSrc: resolveRoomAvatar(
      members,
      myUserId,
      summary.roomType,
      meetingImageUrl,
      detail?.counterpart
    ),
    memberCount: summary.roomType === "direct" ? undefined : members.length || undefined,
    lastMessage: last ? messagePreview(last) : undefined,
    time: last ? formatKstTime(last.createdAt) : undefined,
    unreadCount: summary.unreadCount > 0 ? summary.unreadCount : undefined,
    pinned: summary.pinned,
    notifyEnabled: summary.notifyEnabled,
  }
}

function messagePreview(message: ChatMessageResponse | WsMessageEvent): string {
  if (message.content && message.content.trim()) return message.content
  if (message.imageUrl) return "사진"
  return ""
}

function adaptReplyPreview(replyTo: ChatReplyPreview | null | undefined): ChatReplyPreview | null | undefined {
  if (replyTo == null) return replyTo
  return {
    ...replyTo,
    imageUrl: resolveFileUrl(replyTo.imageUrl) ?? null,
  }
}

// 서버 메시지/실시간 이벤트를 말풍선 모델로 변환한다.
function adaptMessage(
  message: ChatMessageResponse | WsMessageEvent,
  myUserId: number
): ChatMessageView {
  const messageType = normalizeMessageType(message.messageType)
  if (messageType === "system") {
    return {
      messageType,
      id: String(message.messageId),
      messageId: message.messageId,
      content: message.content ?? "",
      createdAt: message.createdAt,
    }
  }

  const isMe = message.senderId === myUserId
  const content = message.content ?? ""
  return {
    messageType,
    id: String(message.messageId),
    messageId: message.messageId,
    senderId: message.senderId,
    sender: isMe ? "me" : "others",
    variant: content.length > 30 ? "long" : "short",
    name: isMe ? undefined : message.senderNickname,
    avatarSrc: resolveFileUrl(message.senderProfileImageUrl),
    texts: content ? [content] : message.imageUrl ? ["사진"] : [""],
    imageUrl: resolveFileUrl(message.imageUrl),
    replyTo: adaptReplyPreview(message.replyTo),
    time: formatKstTime(message.createdAt),
    createdAt: message.createdAt,
  }
}

function adaptMember(member: ChatRoomMemberResponse, myUserId: number): ChatMemberEntry {
  return {
    userId: member.userId,
    name: member.nickname,
    avatarSrc: resolveFileUrl(member.profileImageUrl),
    isMe: member.userId === myUserId,
    countryFlagSrc: flagFromIso2(member.nationality),
    nationalityCode: fromIso2(member.nationality),
  }
}

export {
  roomCategory,
  resolveRoomTitle,
  resolveRoomAvatar,
  adaptRoomSummary,
  adaptMessage,
  adaptMember,
  messagePreview,
  adaptReplyPreview,
}
export type {
  ChatListEntry,
  ChatBubbleMessage,
  ChatMemberEntry,
  ChatMessageView,
  ChatSystemMessage,
  ChatUserBubbleMessage,
}
