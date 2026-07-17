import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"
import { ME_RADIUS, OTHERS_RADIUS, bubblePosition } from "@/features/chat/components/chat-bubble-segment"

type ChatBubbleSender = "me" | "others"
type ChatBubbleVariant = "long" | "short" | "multiple" | "reply"

// DOM(<div>)에 그대로 흘려보낼 임의 prop 확장을 두지 않는다.
// 예전 /chat 테스트 페이지가 메시지 객체를 통째로 spread(`{...message}`)하면서
// createdAt/replyToId 같은 미소비 필드가 DOM 속성으로 새어나가 React 경고를 냈던 것을 방지한다.
interface ChatBubbleProps {
  className?: string
  sender: ChatBubbleSender
  variant: ChatBubbleVariant
  /** others 전용: 그룹 채팅에서 보낸 사람 이름 */
  name?: string
  avatarSrc?: string
  /** long/short: 1개, multiple: 최대 3개 (한 그룹으로 이어붙여 렌더) */
  texts?: string[]
  /** reply 전용 */
  replyLabel?: string
  replyQuote?: string
  replyText?: string
  /** reply 전용: replyQuote 클릭 시 원본 메시지 위치로 이동 */
  onReplyQuoteClick?: () => void
  /** texts 중 답장 대상으로 스크롤된 한 줄의 index. 그룹 전체가 아니라 해당 줄에만 강조 애니메이션을 준다 */
  highlightedIndex?: number
  onHighlightAnimationEnd?: () => void
  time?: string
}

function ChatBubble({
  className,
  sender,
  variant,
  name,
  avatarSrc,
  texts = [],
  replyLabel,
  replyQuote,
  replyText,
  onReplyQuoteClick,
  highlightedIndex,
  onHighlightAnimationEnd,
  time,
}: ChatBubbleProps) {
  const isMe = sender === "me"
  const isReply = variant === "reply"
  const isLong = variant === "long"
  const radiusMap = isMe ? ME_RADIUS : OTHERS_RADIUS

  if (isReply) {
    return (
      <div
        data-slot="chat-bubble"
        className={cn(
          "flex w-full items-end gap-2 py-2",
          isMe ? "flex-col items-end gap-1" : "",
          className
        )}
      >
        {!isMe && <ChatProfile src={avatarSrc} size={26} />}
        <div className={cn("flex flex-col items-start gap-1", isMe ? "w-full items-end" : "flex-1")}>
          <p
            className={cn(
              "text-body-regular-12 text-gray-400",
              isMe && "w-full text-right text-body-regular-13"
            )}
          >
            {replyLabel}
          </p>
          {onReplyQuoteClick ? (
            <button
              type="button"
              onClick={onReplyQuoteClick}
              className={cn(
                "bg-gray-200 px-4 py-3 text-left",
                isMe ? "rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl" : "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl"
              )}
            >
              <p className="text-body-regular-14 text-gray-700">{replyQuote}</p>
            </button>
          ) : (
            <div
              className={cn(
                "bg-gray-200 px-4 py-3",
                isMe ? "rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl" : "rounded-tl-3xl rounded-tr-3xl rounded-br-3xl"
              )}
            >
              <p className="text-body-regular-14 text-gray-700">{replyQuote}</p>
            </div>
          )}
          <div
            className={cn(
              "px-4 py-3",
              isMe ? "rounded-3xl bg-primary" : "rounded-tr-3xl rounded-bl-3xl rounded-br-3xl bg-gray-50"
            )}
          >
            <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{replyText}</p>
          </div>
          {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="chat-bubble"
      className={cn("flex w-full items-end gap-2 py-2", isMe && "justify-end", className)}
    >
      {!isMe && <ChatProfile src={avatarSrc} size={26} />}
      <div className={cn("flex max-w-[75%] flex-col gap-1", isMe ? "items-end" : "items-start")}>
        {!isMe && name && <p className="text-body-regular-12 text-gray-400">{name}</p>}
        {texts.map((text, index) => (
          <div
            key={index}
            onAnimationEnd={index === highlightedIndex ? onHighlightAnimationEnd : undefined}
            className={cn(
              "px-4 py-3",
              isMe ? "bg-primary" : "bg-gray-50",
              radiusMap[bubblePosition(index, texts.length)],
              isLong && "w-[253px] max-w-full",
              index === highlightedIndex && "relative z-10 animate-message-jump-highlight"
            )}
          >
            <p className={cn("text-body-regular-14", isMe ? "text-white" : "text-gray-900")}>{text}</p>
          </div>
        ))}
        {time && <p className="text-body-regular-12 text-gray-400">{time}</p>}
      </div>
    </div>
  )
}

export { ChatBubble }
export type { ChatBubbleSender, ChatBubbleVariant }
