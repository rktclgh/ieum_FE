import type { ChatMessageType } from "@/features/chat/api/chat-types"
import type {
  ChatMessageView,
  ChatSystemMessage,
  ChatUserBubbleMessage,
} from "@/features/chat/lib/chat-adapter"

interface ChatUserMessageRun {
  kind: "user-run"
  runKey: string
  sender: "me" | "others"
  name?: string
  avatarSrc?: string
  time: string
  messages: ChatUserBubbleMessage[]
}

interface ChatSystemMessageItem {
  kind: "system"
  message: ChatSystemMessage
}

type ChatTimelineItem = ChatUserMessageRun | ChatSystemMessageItem
type MinuteKeyFor = (createdAt: string) => string

function normalizeMessageType(messageType?: ChatMessageType): ChatMessageType {
  return messageType ?? "user"
}

function dedupeServerMessages(messages: ChatMessageView[]): ChatMessageView[] {
  const byId = new Map<number, ChatMessageView>()
  for (const message of messages) {
    byId.set(message.messageId, message)
  }
  return [...byId.values()]
}

// system 메시지는 항상 독립 item으로 두어 user run의 경계가 되게 한다.
function buildChatTimeline(
  messages: ChatMessageView[],
  minuteKeyFor: MinuteKeyFor
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = []
  let currentRun: ChatUserMessageRun | undefined
  let currentKey: string | undefined

  for (const message of messages) {
    if (message.messageType === "system") {
      items.push({ kind: "system", message })
      currentRun = undefined
      currentKey = undefined
      continue
    }

    const messageKey = `${message.senderId}|${minuteKeyFor(message.createdAt)}`
    if (currentRun && currentKey === messageKey) {
      currentRun.messages.push(message)
      continue
    }

    currentRun = {
      kind: "user-run",
      runKey: message.id,
      sender: message.sender,
      name: message.name,
      avatarSrc: message.avatarSrc,
      time: message.time,
      messages: [message],
    }
    currentKey = messageKey
    items.push(currentRun)
  }

  return items
}

export { buildChatTimeline, dedupeServerMessages, normalizeMessageType }
export type { ChatSystemMessageItem, ChatTimelineItem, ChatUserMessageRun, MinuteKeyFor }
