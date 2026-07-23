"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"
import { CountryFlag } from "@/features/chat/components/country-flag"
import type { CountryCode } from "@/lib/constants/countries"
import { useTranslation } from "@/lib/i18n/use-translation"

interface ChatRoomMemberItemProps extends React.ComponentProps<"div"> {
  avatarSrc?: string
  name: string
  isMe?: boolean
  isOwner?: boolean
  countryCode?: CountryCode
  nation?: string
  onRemove?: () => void
  disabled?: boolean
  removeLabel?: string
}

function ChatRoomMemberItem({
  className,
  avatarSrc,
  name,
  isMe,
  isOwner,
  countryCode,
  nation,
  onRemove,
  disabled,
  removeLabel,
  ...props
}: ChatRoomMemberItemProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="chat-room-member-item"
      className={cn("flex w-full items-center justify-between px-4 py-3", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <ChatProfile src={avatarSrc} size={44} />
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1">
            {isMe && (
              <span className="flex size-[18px] items-center justify-center rounded-full bg-gray-400 px-1 text-body-regular-12 text-white">
                {messages.chat.meLabel}
              </span>
            )}
            <span className={cn("text-gray-900", isMe ? "text-title-semibold-16" : "text-body-medium-16")}>{name}</span>
            {isOwner && (
              <Image src="/icons/chat/crown.svg" alt="" width={20} height={20} className="size-5" />
            )}
          </div>
          {countryCode && (
            <CountryFlag code={countryCode} country={nation ?? ""} className="[&_span]:text-body-regular-13" />
          )}
        </div>
      </div>
      {onRemove && !isMe && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? messages.chat.removeMemberButton}
          className="flex w-[73px] items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-body-regular-13 text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {messages.chat.removeMemberButton}
        </button>
      )}
    </div>
  )
}

export { ChatRoomMemberItem }
