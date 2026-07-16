import type { ChatReplyPreview } from "@/features/chat/api/chat-types"
import type {
  ChatBubbleMessage,
  ChatMessageView,
} from "@/features/chat/lib/chat-adapter"

interface ReplyLabelTemplates {
  mine: (targetName: string) => string
  others: (senderName: string, targetName: string) => string
}

interface ReplyReference {
  replyTo?: ChatReplyPreview | null
}

function canReplyToMessage(message: ChatMessageView): message is ChatBubbleMessage {
  return (
    message.messageType === "user" &&
    message.sender === "others" &&
    !message.pending &&
    !message.imageUploading &&
    message.messageId > 0
  )
}

function replyTargetFromMessage(message: ChatBubbleMessage): ChatReplyPreview {
  const isImageOnly = Boolean(message.imageUrl)
  return {
    messageId: message.messageId,
    senderId: message.senderId,
    senderNickname: message.name ?? "",
    content: isImageOnly ? null : message.texts[0] ?? null,
    imageUrl: message.imageUrl ?? null,
  }
}

function formatReplyLabel(
  message: ChatBubbleMessage,
  replyTo: ChatReplyPreview,
  templates: ReplyLabelTemplates
): string {
  if (message.sender === "me") return templates.mine(replyTo.senderNickname)
  return templates.others(message.name ?? replyTo.senderNickname, replyTo.senderNickname)
}

function sameReplyTarget(left: ReplyReference, right: ReplyReference): boolean {
  return (left.replyTo?.messageId ?? null) === (right.replyTo?.messageId ?? null)
}

function matchesReplyTargetForEcho(pending: ReplyReference, incoming: ReplyReference): boolean {
  return incoming.replyTo === undefined || sameReplyTarget(pending, incoming)
}

export {
  canReplyToMessage,
  formatReplyLabel,
  matchesReplyTargetForEcho,
  replyTargetFromMessage,
  sameReplyTarget,
}
export type { ReplyLabelTemplates, ReplyReference }
