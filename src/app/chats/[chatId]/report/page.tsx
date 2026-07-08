import { notFound } from "next/navigation"

import { ReportPageContent } from "@/features/report/components/report-page-content"
import { MOCK_CHATS } from "@/features/chat/constants/mock-data"

interface ChatReportPageProps {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ target?: string }>
}

export default async function ChatReportPage({ params, searchParams }: ChatReportPageProps) {
  const { chatId } = await params
  const { target } = await searchParams
  const chat = MOCK_CHATS.find((item) => item.id === chatId)

  if (!chat) notFound()

  return <ReportPageContent targetName={target} />
}
