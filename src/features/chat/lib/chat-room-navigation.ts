import { routes } from "@/lib/navigation/routes"

type ChatRoomEntry = "app" | "direct"

interface ChatRoomBackRouter {
  back: () => void
  replace: (href: string) => void
}

type CanUseBrowserBack = () => boolean

function parseChatRoomEntry(value: string | null): ChatRoomEntry {
  return value === "app" ? "app" : "direct"
}

function canUseChatRoomBrowserBack() {
  return typeof window !== "undefined" && window.history.length > 1
}

function navigateChatRoomBack(
  entry: ChatRoomEntry,
  router: ChatRoomBackRouter,
  canUseBrowserBack: CanUseBrowserBack = canUseChatRoomBrowserBack
) {
  if (entry === "app" && canUseBrowserBack()) {
    router.back()
    return
  }

  router.replace(routes.chats())
}

export { canUseChatRoomBrowserBack, navigateChatRoomBack, parseChatRoomEntry }
export type { ChatRoomEntry }
