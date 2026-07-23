"use client"

import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { APP_BAR_SAFE_TOP } from "@/lib/constants/layout"
import { useTranslation } from "@/lib/i18n/use-translation"

const TRAILING_ICON_NAME = {
  more: "app-bar/more",
  close: "app-bar/close",
} as const

interface AppBarProps extends React.ComponentProps<"div"> {
  /** 가운데 영역에 표시할 텍스트. `center`가 주어지면 무시됨 */
  title?: string
  /** 가운데 영역을 텍스트 대신 커스텀 요소(로고 등)로 대체 */
  center?: React.ReactNode
  /**
   * 제목을 flex 중앙이 아니라 **바 전체의 절대 중앙**에 둔다(issue #419).
   * 좌우 요소의 폭이 다를 때(예: 우측 아이콘 2개) flex 중앙이면 제목이 밀리는데,
   * 이 옵션은 제목을 `absolute`로 띄워 항상 정중앙에 고정한다. `title`에만 적용된다.
   */
  centerTitle?: boolean
  /** 기본 trailing 아이콘 선택. `trailingIcon`이 주어지면 무시됨 */
  trailingVariant?: keyof typeof TRAILING_ICON_NAME
  leadingIcon?: React.ReactNode | null
  trailingIcon?: React.ReactNode | null
  /**
   * trailing 영역을 버튼 래핑 없이 통째로 넘긴다(issue #419).
   * 우측에 아이콘 버튼이 여럿일 때 쓴다 — `trailingIcon`은 하나를 `<button>`으로 감싸므로
   * 버튼 안에 버튼이 들어가는 문제가 생긴다. `trailingSlot`이 있으면 다른 trailing 처리는 무시된다.
   */
  trailingSlot?: React.ReactNode
  onLeadingClick?: () => void
  onTrailingClick?: () => void
}

function AppBar({
  className,
  title,
  center,
  centerTitle = false,
  trailingVariant = "more",
  leadingIcon,
  trailingIcon,
  trailingSlot,
  onLeadingClick,
  onTrailingClick,
  ...props
}: AppBarProps) {
  const { messages } = useTranslation()

  return (
    <div
      data-slot="app-bar"
      // issue #279: 대부분 화면의 첫 요소라 상태바/노치를 직접 받아낸다.
      className={cn(
        "flex w-full items-center justify-between px-4 pb-4",
        centerTitle && "relative",
        APP_BAR_SAFE_TOP,
        className
      )}
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
          {leadingIcon ?? <Icon name="arrow/left" width={24} height={24} className="size-6" />}
        </button>
      )}

      {center ?? (
        <p
          className={cn(
            "text-title-semibold-18 text-gray-900",
            centerTitle && "absolute left-1/2 -translate-x-1/2"
          )}
        >
          {title}
        </p>
      )}

      {trailingSlot !== undefined ? (
        trailingSlot
      ) : trailingIcon === null ? (
        <span className="size-6 shrink-0" />
      ) : (
        <button
          type="button"
          aria-label={trailingVariant === "close" ? messages.common.close : messages.common.more}
          onClick={onTrailingClick}
          className="flex size-6 shrink-0 items-center justify-center"
        >
          {trailingIcon ?? (
            <Icon name={TRAILING_ICON_NAME[trailingVariant]} width={24} height={24} className="size-6" />
          )}
        </button>
      )}
    </div>
  )
}

export { AppBar }
