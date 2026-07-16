"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatMessageInputProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  onSend?: (value: string) => boolean | void
  onCameraClick?: () => void
  replyPreview?: {
    messageId: number
    label: string
    quote: string
    imageUrl?: string | null
  } | null
  onCancelReply?: () => void
}

function ChatMessageInput({
  className,
  disabled = false,
  value,
  onChange,
  onSend,
  onCameraClick,
  replyPreview,
  onCancelReply,
  ...props
}: ChatMessageInputProps) {
  const { messages } = useTranslation()
  const [uncontrolledValue, setUncontrolledValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue
  const replyMessageId = replyPreview?.messageId

  React.useEffect(() => {
    if (replyMessageId != null) inputRef.current?.focus()
  }, [replyMessageId])

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolledValue(next)
    onChange?.(next)
  }

  const handleSend = () => {
    if (disabled || !currentValue.trim()) return
    const sent = onSend?.(currentValue)
    if (sent !== false) setValue("")
  }

  const input = (
    <div
      data-slot="chat-message-input"
      aria-disabled={disabled}
      className={cn(
        "flex items-center justify-between gap-2 rounded-full border border-gray-50 bg-gray-50/95 p-2 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    >
      <button
        type="button"
        aria-label={messages.chat.takePhotoAction}
        onClick={onCameraClick}
        disabled={disabled}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image src="/icons/chat/camera-fill.svg" alt="" width={20} height={20} className="size-5" />
      </button>
      <input
        ref={inputRef}
        disabled={disabled}
        value={currentValue}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // 한글/일본어/중국어 IME 조합 중 Enter로 글자를 확정할 때는 전송하지 않는다.
          if (event.key === "Enter" && !event.nativeEvent.isComposing) handleSend()
        }}
        placeholder={messages.chat.messageInputPlaceholder}
        className="flex-1 bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        aria-label={messages.chat.sendButtonLabel}
        onClick={handleSend}
        disabled={disabled}
        className="size-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image src="/icons/chat/send-button.svg" alt="" width={32} height={32} className="size-8" />
      </button>
    </div>
  )

  if (!replyPreview) return input

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-gray-50/95 p-2 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]">
      <div className="flex min-w-0 items-center gap-2 px-2 pt-1">
        <Image src="/icons/chat/respond.svg" alt="" width={18} height={18} className="size-[18px] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-body-regular-12 text-gray-400">{replyPreview.label}</p>
          <div className="flex min-w-0 items-center gap-1">
            {replyPreview.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={replyPreview.imageUrl} alt="" className="size-5 rounded object-cover opacity-70" />
            )}
            <p className="truncate text-body-regular-13 text-gray-700">{replyPreview.quote}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={messages.chat.cancelReplyAction}
          onClick={onCancelReply}
          disabled={disabled}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl leading-none text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ×
        </button>
      </div>
      {input}
    </div>
  )
}

export { ChatMessageInput }
