import { notFound } from "next/navigation"

import { ReportPageContent } from "@/features/report/components/report-page-content"

interface ChatReportPageProps {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ target?: string }>
}

export default async function ChatReportPage({ params, searchParams }: ChatReportPageProps) {
  const { chatId } = await params
  const { target } = await searchParams
  const roomId = Number(chatId)

  if (!Number.isInteger(roomId) || roomId <= 0) notFound()

  return <ReportPageContent targetName={target} />
}
