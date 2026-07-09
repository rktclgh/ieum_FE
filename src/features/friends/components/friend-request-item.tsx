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
  /** 국적(검색 결과에만 존재). 친구/요청 목록 응답에는 없으므로 선택값이다. */
  flagSrc?: string
  nation?: string
  variant: FriendRequestVariant
  /** 롱프레스 메뉴가 열려 있는 동안 딤 오버레이 위로 떠 보이도록 강조 */
  active?: boolean
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
  active,
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
      className={cn(
        "flex w-full items-center justify-between py-3 transition-all duration-200 ease-out",
        active
          ? "relative z-50 -translate-y-1 scale-[1.02] gap-2 rounded-2xl bg-white px-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]"
          : "translate-y-0 scale-100",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <ChatProfile src={avatarSrc} size={active ? 40 : 44} className="transition-all duration-200 ease-out" />
        <div className="flex flex-col items-start gap-0.5">
          <p
            className={cn(
              "text-gray-900 transition-all duration-200 ease-out",
              active ? "text-body-semibold-15" : "text-title-semibold-16"
            )}
          >
            <HighlightedText text={name} query={highlightQuery} />
          </p>
          {flagSrc && nation && <CountryFlag flagSrc={flagSrc} country={nation} />}
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
