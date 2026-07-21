"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"
import { MessageTextarea } from "@/components/ui/text-field/message-textarea"

type ChatMessageSendResult = "published" | "awaiting-echo" | "failed"

interface ChatMessageInputProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
  onSend?: (value: string) => ChatMessageSendResult | void
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
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue
  const replyMessageId = replyPreview?.messageId

  React.useEffect(() => {
    if (replyMessageId != null) inputRef.current?.focus()
  }, [replyMessageId])

  const focusInput = () => inputRef.current?.focus()

  const preserveTextInputFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    focusInput()
  }

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolledValue(next)
    onChange?.(next)
  }

  const handleSend = () => {
    if (disabled || !currentValue.trim()) return
    // 줄바꿈이 가능해지면서 앞뒤 개행이 그대로 실려 말풍선에 빈 줄이 생길 수 있어 다듬어 보낸다.
    const sent = onSend?.(currentValue.trim())
    if (sent !== "failed" && sent !== "awaiting-echo") setValue("")
    focusInput()
  }

  const input = (
    <div
      data-slot="chat-message-input"
      aria-disabled={disabled}
      className={cn(
        "flex items-end justify-between gap-2 rounded-3xl border border-gray-50 bg-gray-50/95 p-2 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    >
      <button
        type="button"
        aria-label={messages.chat.attachImageAction}
        onClick={onCameraClick}
        disabled={disabled}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image src="/icons/chat/camera-fill.svg" alt="" width={20} height={20} className="size-5" />
      </button>
      <MessageTextarea
        ref={inputRef}
        disabled={disabled}
        value={currentValue}
        onChange={(event) => setValue(event.target.value)}
        onSubmit={handleSend}
        placeholder={messages.chat.messageInputPlaceholder}
        className="py-1.5"
      />
      <button
        type="button"
        aria-label={messages.chat.sendButtonLabel}
        onPointerDown={preserveTextInputFocus}
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
export type { ChatMessageSendResult }
