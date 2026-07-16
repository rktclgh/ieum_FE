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
  return incoming.replyTo !== undefined && sameReplyTarget(pending, incoming)
}

function matchesPendingMessagePayload(pending: ChatBubbleMessage, incoming: ChatBubbleMessage): boolean {
  if (pending.imageUrl) return !pending.imageUploading && Boolean(incoming.imageUrl)
  return !incoming.imageUrl && pending.texts[0] === incoming.texts[0]
}

function isWithinPendingMatchWindow(
  pending: ChatBubbleMessage,
  incoming: ChatBubbleMessage,
  matchWindowMs: number
): boolean {
  return Math.abs(new Date(incoming.createdAt).getTime() - new Date(pending.createdAt).getTime()) < matchWindowMs
}

// 구 서버 이벤트가 replyTo를 생략하면 답장 여부를 알 수 없다. payload·시간이 같은 pending이
// 하나일 때만 롤링 배포 호환을 위해 대체하고, 둘 이상이면 REST backfill까지 보존한다.
function findPendingEchoMatch(
  pendingMessages: ChatBubbleMessage[],
  incoming: ChatBubbleMessage,
  matchWindowMs: number
): ChatBubbleMessage | undefined {
  const deliveryCandidates = pendingMessages.filter(
    (pending) =>
      matchesPendingMessagePayload(pending, incoming) &&
      isWithinPendingMatchWindow(pending, incoming, matchWindowMs)
  )

  if (incoming.replyTo === undefined) {
    return deliveryCandidates.length === 1 ? deliveryCandidates[0] : undefined
  }

  return deliveryCandidates.find((pending) => matchesReplyTargetForEcho(pending, incoming))
}

function shouldClearSelectedReplyAfterAcceptedEcho(
  selectedReply: ChatReplyPreview | null,
  matchedPending: ChatBubbleMessage
): boolean {
  return selectedReply?.messageId === matchedPending.replyTo?.messageId
}

function shouldClearDraftAfterAcceptedEcho(draft: string, matchedPending: ChatBubbleMessage): boolean {
  return (
    matchedPending.replyTo != null &&
    !matchedPending.imageUrl &&
    draft.trim() === matchedPending.texts[0]
  )
}

export {
  canReplyToMessage,
  formatReplyLabel,
  findPendingEchoMatch,
  matchesReplyTargetForEcho,
  replyTargetFromMessage,
  sameReplyTarget,
  shouldClearDraftAfterAcceptedEcho,
  shouldClearSelectedReplyAfterAcceptedEcho,
}
export type { ReplyLabelTemplates, ReplyReference }
