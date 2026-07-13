import { notFound } from "next/navigation"

import { ReportPageContent } from "@/features/report/components/report-page-content"

interface ChatReportPageProps {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ target?: string; messageId?: string }>
}

export default async function ChatReportPage({ params, searchParams }: ChatReportPageProps) {
  const { chatId } = await params
  const { target, messageId } = await searchParams
  const roomId = Number(chatId)
  const parsedMessageId = Number(messageId)

  if (!Number.isInteger(roomId) || roomId <= 0) notFound()
  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) notFound()

  return <ReportPageContent messageId={parsedMessageId} targetName={target} />
}
