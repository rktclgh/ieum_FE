import type { ChatBubbleMessage, ChatMessageView } from "@/features/chat/lib/chat-adapter"

interface TranslateContext {
  isAuthenticated: boolean
}

// 내가 쓴 글은 내가 신고할 이유가 없어 메뉴에서 아예 감춘다. 시스템 메시지도 신고 대상이 아니다.
function canReportMessage(message: ChatMessageView): message is ChatBubbleMessage {
  return message.messageType === "user" && message.sender === "others"
}

// 내가 쓴 글은 내 언어라 번역이 불필요하다. 낙관적(pending) 말풍선은 서버 메시지 ID가 없어 제외한다.
function canTranslateMessage(message: ChatMessageView, { isAuthenticated }: TranslateContext): boolean {
  return (
    isAuthenticated &&
    message.messageType === "user" &&
    message.sender === "others" &&
    !message.pending &&
    message.hasText
  )
}

export { canReportMessage, canTranslateMessage }
