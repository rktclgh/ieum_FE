import * as React from "react"

import { cn } from "@/lib/utils"

interface ChatContextMenuItem {
  icon: React.ReactNode
  label: string
  tone?: "default" | "destructive"
  disabled?: boolean
  onClick?: () => void
}

interface ChatContextMenuProps extends React.ComponentProps<"div"> {
  items: ChatContextMenuItem[]
  /** true면 뒤 배경에 반투명 딤 오버레이를 함께 렌더 (롱프레스 메뉴), false면 팝업만 (카메라 버튼 등) */
  dimmed?: boolean
  onDismiss?: () => void
}

function ChatContextMenu({ className, items, dimmed = false, onDismiss, style, ...props }: ChatContextMenuProps) {
  return (
    <>
      {dimmed && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onDismiss}
          role="presentation"
        />
      )}
      <div
        data-slot="chat-context-menu"
        className={cn(
          "absolute z-50 flex flex-col gap-1 rounded-3xl bg-white/80 px-6 py-3 shadow-[0px_2px_20px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm",
          className
        )}
        style={style}
        {...props}
      >
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className="flex w-[193px] items-center gap-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.icon}
            <span
              className={cn(
                "text-body-medium-15",
                item.tone === "destructive" ? "text-red" : "text-gray-900"
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

export { ChatContextMenu }
export type { ChatContextMenuItem }
