"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { ChatProfile } from "@/features/chat/components/chat-profile"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { useTranslation } from "@/lib/i18n/use-translation"

type FriendRequestVariant = "request" | "add" | "requested" | "friend"

interface FriendRequestItemProps extends React.ComponentProps<"div"> {
  avatarSrc?: string
  name: string
  /** 이름 중 이 문자열과 일치하는 부분을 강조 표시 (친구 검색 화면) */
  highlightQuery?: string
  flagSrc: string
  nation: string
  variant: FriendRequestVariant
  onAccept?: () => void
  onReject?: () => void
  onAdd?: () => void
  onStartChat?: () => void
}

function PillButton({
  tone = "filled",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { tone?: "filled" | "outline" }) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-lg px-3 py-2 text-body-regular-13",
        tone === "filled" ? "bg-primary-600 text-white" : "border border-primary-600 bg-white text-primary-600",
        "disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function FriendRequestItem({
  className,
  avatarSrc,
  name,
  highlightQuery,
  flagSrc,
  nation,
  variant,
  onAccept,
  onReject,
  onAdd,
  onStartChat,
  ...props
}: FriendRequestItemProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="friend-request-item"
      className={cn("flex w-full items-center justify-between py-3", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <ChatProfile src={avatarSrc} size={44} />
        <div className="flex flex-col items-start gap-0.5">
          <p className="text-title-semibold-16 text-gray-900">
            <HighlightedText text={name} query={highlightQuery} />
          </p>
          <CountryFlag flagSrc={flagSrc} country={nation} />
        </div>
      </div>

      {variant === "request" && (
        <div className="flex items-center gap-2">
          <PillButton onClick={onAccept}>{messages.chat.acceptButton}</PillButton>
          <PillButton tone="outline" onClick={onReject}>
            {messages.chat.rejectButton}
          </PillButton>
        </div>
      )}
      {variant === "add" && <PillButton onClick={onAdd}>{messages.chat.addFriendButton}</PillButton>}
      {variant === "requested" && (
        <PillButton tone="outline" className="w-[73px]" disabled>
          {messages.chat.requestedButton}
        </PillButton>
      )}
      {variant === "friend" && (
        <PillButton onClick={onStartChat}>{messages.chat.startChatButton}</PillButton>
      )}
    </div>
  )
}

export { FriendRequestItem }
export type { FriendRequestVariant }
