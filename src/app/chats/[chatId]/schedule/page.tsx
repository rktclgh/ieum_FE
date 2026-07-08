import { notFound } from "next/navigation"

import { SchedulePageContent } from "@/features/schedule/components/schedule-page-content"
import { MOCK_CHATS } from "@/features/chat/constants/mock-data"

interface ChatSchedulePageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatSchedulePage({ params }: ChatSchedulePageProps) {
  const { chatId } = await params
  const chat = MOCK_CHATS.find((item) => item.id === chatId)

  if (!chat) notFound()

  return <SchedulePageContent />
}
