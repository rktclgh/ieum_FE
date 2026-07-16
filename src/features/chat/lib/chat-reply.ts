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

// 구 서버 이벤트가 replyTo를 생략하면 답장 여부를 알 수 없다. 답장 pending은 절대 대체하지 않고,
// 유일한 일반 pending만 호환 처리한다. 답장은 REST backfill의 명시적 replyTo까지 보존한다.
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
    if (deliveryCandidates.some((pending) => pending.replyTo != null)) return undefined
    return deliveryCandidates.length === 1 && deliveryCandidates[0]?.replyTo === null
      ? deliveryCandidates[0]
      : undefined
  }

  return deliveryCandidates.find((pending) => matchesReplyTargetForEcho(pending, incoming))
}

function hasUnconfirmedReplyPendingForEcho(
  pendingMessages: ChatBubbleMessage[],
  incoming: ChatBubbleMessage,
  matchWindowMs: number
): boolean {
  if (incoming.replyTo !== undefined) return false

  return pendingMessages.some(
    (pending) =>
      pending.replyTo != null &&
      matchesPendingMessagePayload(pending, incoming) &&
      isWithinPendingMatchWindow(pending, incoming, matchWindowMs)
  )
}

function findConfirmedReplyPendingFromHistory(
  pendingMessages: ChatBubbleMessage[],
  historyMessages: ChatMessageView[],
  matchWindowMs: number
): ChatBubbleMessage | undefined {
  for (const message of historyMessages) {
    if (message.messageType !== "user" || message.sender !== "me" || message.replyTo === undefined) continue
    const match = findPendingEchoMatch(pendingMessages, message, matchWindowMs)
    if (match?.replyTo != null) return match
  }
  return undefined
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
  findConfirmedReplyPendingFromHistory,
  formatReplyLabel,
  findPendingEchoMatch,
  hasUnconfirmedReplyPendingForEcho,
  matchesReplyTargetForEcho,
  replyTargetFromMessage,
  sameReplyTarget,
  shouldClearDraftAfterAcceptedEcho,
  shouldClearSelectedReplyAfterAcceptedEcho,
}
export type { ReplyLabelTemplates, ReplyReference }
