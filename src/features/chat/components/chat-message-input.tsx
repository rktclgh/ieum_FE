"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatMessageInputProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value?: string
  onChange?: (value: string) => void
  onSend?: (value: string) => void
  onCameraClick?: () => void
}

function ChatMessageInput({ className, value, onChange, onSend, onCameraClick, ...props }: ChatMessageInputProps) {
  const { messages } = useTranslation()
  const [uncontrolledValue, setUncontrolledValue] = React.useState("")
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue

  const setValue = (next: string) => {
    if (!isControlled) setUncontrolledValue(next)
    onChange?.(next)
  }

  const handleSend = () => {
    if (!currentValue.trim()) return
    onSend?.(currentValue)
    setValue("")
  }

  return (
    <div
      data-slot="chat-message-input"
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
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-400"
      >
        <Image src="/icons/chat/camera-fill.svg" alt="" width={20} height={20} className="size-5" />
      </button>
      <input
        value={currentValue}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // 한글/일본어/중국어 IME 조합 중 Enter로 글자를 확정할 때는 전송하지 않는다.
          if (event.key === "Enter" && !event.nativeEvent.isComposing) handleSend()
        }}
        placeholder={messages.chat.messageInputPlaceholder}
        className="flex-1 bg-transparent text-body-regular-14 text-gray-900 outline-none placeholder:text-gray-400"
      />
      <button
        type="button"
        aria-label={messages.chat.sendButtonLabel}
        onClick={handleSend}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-400"
      >
        <Image src="/icons/chat/send.svg" alt="" width={16} height={16} className="size-4" />
      </button>
    </div>
  )
}

export { ChatMessageInput }
