import type { Messages } from "@/lib/i18n/messages/ko"

export interface TabItem {
  labelKey: keyof Messages["tabBar"]
  href: string
  icon: string
}

// TODO: 질문 아이콘 교체 필요 (question-fill/question-line 추가되면 home -> question)
export const TAB_ITEMS: TabItem[] = [
  { labelKey: "home", href: "/", icon: "home" },
  { labelKey: "meetups", href: "/chats", icon: "chat" },
  { labelKey: "questions", href: "/questions", icon: "home" },
  { labelKey: "my", href: "/my", icon: "my" },
]
