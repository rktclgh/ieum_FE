import { resolveFileUrl } from "@/lib/api/file-url"
import { formatKstTime, getKstMinuteKey } from "@/lib/date/kst"
import type { ChatFilterCategory } from "@/features/chat/components/chat-filter-chips"
import type {
  ChatMessageResponse,
  ChatRoomDetailResponse,
  ChatRoomMemberResponse,
  ChatRoomSummaryResponse,
  RoomType,
  WsMessageEvent,
} from "@/features/chat/api/chat-types"
import { flagFromIso2, fromIso2 } from "@/features/join/lib/nationality-map"
import type { CountryCode } from "@/lib/constants/countries"

// 목록/방 UI가 공통으로 쓰는 뷰 모델.

interface ChatListEntry {
  roomId: number
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
  id: string
  messageId: number
  senderId: number
  sender: "me" | "others"
  variant: "long" | "short"
  name?: string
  texts: string[]
  imageUrl?: string
  time: string
  createdAt: string
}

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

function resolveRoomAvatar(members: ChatRoomMemberResponse[], myUserId: number): string | undefined {
  const other = members.find((member) => member.userId !== myUserId)
  return resolveFileUrl(other?.profileImageUrl)
}

// summary + detail(제목 파생용)을 목록 항목으로 합친다.
function adaptRoomSummary(
  summary: ChatRoomSummaryResponse,
  detail: ChatRoomDetailResponse | undefined,
  myUserId: number
): ChatListEntry {
  const members = detail?.members ?? []
  const last = summary.lastMessage
  return {
    roomId: summary.roomId,
    title: detail ? resolveRoomTitle(members, myUserId, summary.roomType) : `채팅방 ${summary.roomId}`,
    category: roomCategory(summary.roomType),
    avatarSrc: resolveRoomAvatar(members, myUserId),
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

// 서버 메시지/실시간 이벤트를 말풍선 모델로 변환한다.
function adaptMessage(
  message: ChatMessageResponse | WsMessageEvent,
  myUserId: number
): ChatBubbleMessage {
  const isMe = message.senderId === myUserId
  const content = message.content ?? ""
  return {
    id: String(message.messageId),
    messageId: message.messageId,
    senderId: message.senderId,
    sender: isMe ? "me" : "others",
    variant: content.length > 30 ? "long" : "short",
    name: isMe ? undefined : message.senderNickname,
    texts: content ? [content] : message.imageUrl ? ["사진"] : [""],
    imageUrl: resolveFileUrl(message.imageUrl),
    time: formatKstTime(message.createdAt),
    createdAt: message.createdAt,
  }
}

interface ChatMessageRun {
  runKey: string
  sender: "me" | "others"
  name?: string
  time: string
  messages: ChatBubbleMessage[]
}

// 연속된 같은 발신자(senderId)·같은 분(minute) 메시지를 하나의 run으로 묶는다.
// 입력은 이미 오래된→최신 정렬 + 같은 날짜 그룹 내 메시지를 가정한다.
function buildMessageRuns(messages: ChatBubbleMessage[]): ChatMessageRun[] {
  const runs: ChatMessageRun[] = []
  let currentKey: string | null = null
  for (const message of messages) {
    const minuteKey = `${message.senderId}|${getKstMinuteKey(message.createdAt)}`
    const lastRun = runs[runs.length - 1]
    if (lastRun && currentKey === minuteKey) {
      lastRun.messages.push(message)
    } else {
      runs.push({
        runKey: message.id,
        sender: message.sender,
        name: message.name,
        time: message.time,
        messages: [message],
      })
    }
    currentKey = minuteKey
  }
  return runs
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
  buildMessageRuns,
}
export type { ChatListEntry, ChatBubbleMessage, ChatMemberEntry, ChatMessageRun }
