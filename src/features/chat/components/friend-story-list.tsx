import * as React from "react"

import { cn } from "@/lib/utils"
import { ChatProfile } from "@/features/chat/components/chat-profile"

interface FriendStoryItem {
  id: string
  name: string
  src?: string
  online?: boolean
}

interface FriendStoryListProps extends React.ComponentProps<"div"> {
  items: FriendStoryItem[]
  onItemClick?: (item: FriendStoryItem) => void
}

function FriendStoryList({ className, items, onItemClick, ...props }: FriendStoryListProps) {
  return (
    <div
      data-slot="friend-story-list"
      className={cn("flex items-center gap-4 overflow-x-auto px-4 py-2", className)}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick?.(item)}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <ChatProfile src={item.src} size={64} online={item.online} />
          <span className="max-w-16 truncate text-body-medium-14 text-gray-900">{item.name}</span>
        </button>
      ))}
    </div>
  )
}

export { FriendStoryList }
export type { FriendStoryItem }
