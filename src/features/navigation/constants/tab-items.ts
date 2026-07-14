import type { Messages } from "@/lib/i18n/messages/ko"
import { routes } from "@/lib/navigation/routes"

export interface TabItem {
  labelKey: keyof Messages["tabBar"]
  href: string
  icon: string
}

export const TAB_ITEMS: TabItem[] = [
  { labelKey: "home", href: routes.home(), icon: "home" },
  { labelKey: "chat", href: routes.chats(), icon: "chat" },
  { labelKey: "questions", href: routes.questions(), icon: "question" },
  { labelKey: "my", href: routes.my(), icon: "my" },
]
