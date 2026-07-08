import { notFound } from "next/navigation"

import { ChatRoomPageContent } from "@/features/chat/components/chat-room-page-content"
import { MOCK_CHATS } from "@/features/chat/constants/mock-data"

interface ChatRoomPageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { chatId } = await params
  const chat = MOCK_CHATS.find((item) => item.id === chatId)

  if (!chat) notFound()

  return <ChatRoomPageContent chat={chat} />
}
