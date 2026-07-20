"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  LONG_PRESS_INACTIVE,
  LONG_PRESS_SURFACE_ACTIVE,
  LONG_PRESS_TRANSITION,
} from "@/lib/long-press-styles"
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
  /** 국적. 국가 코드 매칭에 실패하면 국기를 생략하므로 선택값이다. */
  flagSrc?: string
  nation?: string
  variant: FriendRequestVariant
  /** 롱프레스 메뉴가 열려 있는 동안 딤 오버레이 위로 떠 보이도록 강조 */
  active?: boolean
  /** 온라인 상태(최근 5분 이내 활동) — 아바타 우하단 상태 점. undefined면 점을 숨긴다. */
  online?: boolean
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
  online,
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
        "flex w-full items-center justify-between py-3",
        LONG_PRESS_TRANSITION,
        // 롱프레스 리프트와 겹쳐 눌린 동안 카드가 흐려 보이므로 :active 딤은 두지 않는다 (채팅 목록 기준).
        isTappable && "cursor-pointer",
        active ? cn(LONG_PRESS_SURFACE_ACTIVE, "gap-2 px-3") : LONG_PRESS_INACTIVE,
        className
      )}
      {...restProps}
    >
      <div className="flex items-center gap-3">
        <ChatProfile src={avatarSrc} size={active ? 40 : 44} online={online} className={LONG_PRESS_TRANSITION} />
        <div className="flex flex-col items-start gap-0.5">
          <p
            className={cn(
              "text-gray-900",
              LONG_PRESS_TRANSITION,
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
