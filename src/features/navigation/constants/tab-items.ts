import type { Messages } from "@/lib/i18n/messages/ko"
import { routes } from "@/lib/navigation/routes"

export interface TabItem {
  labelKey: keyof Messages["tabBar"]
  href: string
  icon: string
}

// TODO: 질문 아이콘 교체 필요 (question-fill/question-line 추가되면 home -> question)
export const TAB_ITEMS: TabItem[] = [
  { labelKey: "home", href: routes.home(), icon: "home" },
  { labelKey: "meetups", href: routes.chats(), icon: "chat" },
  { labelKey: "questions", href: routes.questions(), icon: "home" },
  { labelKey: "my", href: routes.my(), icon: "my" },
]
