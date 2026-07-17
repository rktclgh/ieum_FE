"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { HighlightedText } from "@/components/ui/highlighted-text"
import { ChatProfile } from "@/features/chat/components/chat-profile"
import { CountryFlag } from "@/features/chat/components/country-flag"
import { useTranslation } from "@/lib/i18n/use-translation"

type FriendRequestVariant = "request" | "add" | "requested" | "friend" | "sent"

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
  onCancel?: () => void
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
        tone === "filled" ? "bg-primary text-white" : "border border-primary bg-white text-primary",
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
  onCancel,
  ...props
}: FriendRequestItemProps) {
  const { messages } = useTranslation()

  // 친구 행은 버튼 없이 행 전체를 눌러 채팅방으로 입장한다. (롱프레스 메뉴는 useLongPress가 별도 처리)
  const isTappable = variant === "friend"
  // props로 넘어온 onClick/onKeyDown을 덮어쓰지 않고 합성한다. (spread 순서에 의존하지 않도록 분리)
  const { onClick: onClickProp, onKeyDown: onKeyDownProp, ...restProps } = props

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClickProp?.(event)
    if (isTappable) onStartChat?.()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDownProp?.(event)
    if (isTappable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      onStartChat?.()
    }
  }

  return (
    <div
      data-slot="friend-request-item"
      role={isTappable ? "button" : undefined}
      tabIndex={isTappable ? 0 : undefined}
      onClick={isTappable || onClickProp ? handleClick : undefined}
      onKeyDown={isTappable || onKeyDownProp ? handleKeyDown : undefined}
      className={cn(
        "flex w-full items-center justify-between py-3 transition-all duration-200 ease-out",
        isTappable && "cursor-pointer active:opacity-70",
        active
          ? "relative z-50 -translate-y-1 scale-[1.02] gap-2 rounded-2xl bg-white px-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)]"
          : "translate-y-0 scale-100",
        className
      )}
      {...restProps}
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
        <PillButton tone="outline" className="w-[73px]">
          {messages.chat.requestedButton}
        </PillButton>
      )}
      {variant === "sent" && (
        <PillButton tone="outline" onClick={onCancel}>
          {messages.chat.cancelRequestButton}
        </PillButton>
      )}
    </div>
  )
}

export { FriendRequestItem }
export type { FriendRequestVariant }
