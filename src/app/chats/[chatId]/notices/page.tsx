import { notFound } from "next/navigation"

import { NoticePageContent } from "@/features/chat/components/notice-page-content"

interface ChatNoticesPageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatNoticesPage({ params }: ChatNoticesPageProps) {
  const { chatId } = await params
  const roomId = Number(chatId)

  if (!Number.isInteger(roomId) || roomId <= 0) notFound()

  return <NoticePageContent />
}
