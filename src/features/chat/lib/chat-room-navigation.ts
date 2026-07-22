import { routes } from "@/lib/navigation/routes"

interface ChatRoomBackRouter {
  back: () => void
  replace: (href: string) => void
}

function navigateChatRoomBack(historyLength: number, router: ChatRoomBackRouter) {
  if (historyLength > 1) {
    router.back()
    return
  }

  router.replace(routes.chats())
}

export { navigateChatRoomBack }
