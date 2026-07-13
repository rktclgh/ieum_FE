import { notFound } from "next/navigation"

import { SchedulePageContent } from "@/features/schedule/components/schedule-page-content"

interface ChatSchedulePageProps {
  params: Promise<{ chatId: string }>
}

export default async function ChatSchedulePage({ params }: ChatSchedulePageProps) {
  const { chatId } = await params
  const roomId = Number(chatId)

  if (!Number.isInteger(roomId) || roomId <= 0) notFound()

  return <SchedulePageContent />
}
