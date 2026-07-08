import { notFound } from "next/navigation"

import { NoticePageContent } from "@/features/chat/components/notice-page-content"
import { MOCK_CHATS } from "@/features/chat/constants/mock-data"

interface ChatNoticesPageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatNoticesPage({ params }: ChatNoticesPageProps) {
  const { chatId } = await params
  const chat = MOCK_CHATS.find((item) => item.id === chatId)

  if (!chat) notFound()

  return <NoticePageContent />
}
