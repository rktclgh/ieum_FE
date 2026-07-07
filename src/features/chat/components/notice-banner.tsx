import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface NoticeBannerProps extends React.ComponentProps<"div"> {
  text: string
  onClose?: () => void
}

function NoticeBanner({ className, text, onClose, ...props }: NoticeBannerProps) {
  return (
    <div
      data-slot="notice-banner"
      className={cn(
        "flex items-center justify-between rounded-xl bg-gray-50 p-3 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Image src="/icons/chat/notification.svg" alt="" width={18} height={20} className="h-5 w-[18px]" />
        <p className="text-body-regular-14 text-gray-900">{text}</p>
      </div>
      <button type="button" aria-label="닫기" onClick={onClose} className="flex size-4 shrink-0 items-center justify-center">
        <Image src="/icons/app-bar/close.svg" alt="" width={16} height={16} className="size-4" />
      </button>
    </div>
  )
}

export { NoticeBanner }
