"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

const TRAILING_ICON_SRC = {
  more: "/icons/app-bar/more.svg",
  close: "/icons/app-bar/close.svg",
} as const

interface AppBarProps extends React.ComponentProps<"div"> {
  /** 가운데 영역에 표시할 텍스트. `center`가 주어지면 무시됨 */
  title?: string
  /** 가운데 영역을 텍스트 대신 커스텀 요소(로고 등)로 대체 */
  center?: React.ReactNode
  /** 기본 trailing 아이콘 선택. `trailingIcon`이 주어지면 무시됨 */
  trailingVariant?: keyof typeof TRAILING_ICON_SRC
  leadingIcon?: React.ReactNode | null
  trailingIcon?: React.ReactNode | null
  onLeadingClick?: () => void
  onTrailingClick?: () => void
}

function AppBar({
  className,
  title,
  center,
  trailingVariant = "more",
  leadingIcon,
  trailingIcon,
  onLeadingClick,
  onTrailingClick,
  ...props
}: AppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="app-bar"
      className={cn("flex w-full items-center justify-between p-4", className)}
      {...props}
    >
      {leadingIcon === null ? (
        <span className="size-6 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={messages.common.back}
          onClick={onLeadingClick}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          {leadingIcon ?? (
            <Image src="/icons/arrow/left.svg" alt="" width={24} height={24} className="size-6" />
          )}
        </button>
      )}

      {center ?? <p className="text-title-semibold-18 text-gray-900">{title}</p>}

      {trailingIcon === null ? (
        <span className="size-6 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={trailingVariant === "close" ? messages.common.close : messages.common.more}
          onClick={onTrailingClick}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          {trailingIcon ?? (
            <Image
              src={TRAILING_ICON_SRC[trailingVariant]}
              alt=""
              width={24}
              height={24}
              className="size-6"
            />
          )}
        </button>
      )}
    </div>
  )
}

export { AppBar }
