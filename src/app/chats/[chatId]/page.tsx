import { notFound } from "next/navigation"

import { ChatRoomPageContent } from "@/features/chat/components/chat-room-page-content"

interface ChatRoomPageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { chatId } = await params
  const roomId = Number(chatId)

  if (!Number.isInteger(roomId) || roomId <= 0) notFound()

  return <ChatRoomPageContent roomId={roomId} />
}
