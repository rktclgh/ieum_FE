export interface TabItem {
  label: string
  href: string
  icon: string
}

// TODO: 질문 아이콘 교체 필요 (question-fill/question-line 추가되면 home -> question)
export const TAB_ITEMS: TabItem[] = [
  { label: "홈", href: "/", icon: "home" },
  { label: "모임", href: "/chats", icon: "chat" },
  { label: "질문", href: "/questions", icon: "home" },
  { label: "마이", href: "/my", icon: "my" },
]
