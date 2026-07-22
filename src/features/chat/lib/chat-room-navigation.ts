import { routes } from "@/lib/navigation/routes"

type ChatRoomEntry = "app" | "direct"

interface ChatRoomBackRouter {
  back: () => void
  replace: (href: string) => void
}

function parseChatRoomEntry(value: string | null): ChatRoomEntry {
  return value === "app" ? "app" : "direct"
}

function navigateChatRoomBack(entry: ChatRoomEntry, router: ChatRoomBackRouter) {
  if (entry === "app") {
    router.back()
    return
  }

  router.replace(routes.chats())
}

export { navigateChatRoomBack, parseChatRoomEntry }
export type { ChatRoomEntry }
