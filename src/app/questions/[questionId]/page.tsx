import { notFound } from "next/navigation"

import { QuestionDetailScreen } from "@/features/question/components/question-detail-screen"

interface QuestionDetailPageProps {
  params: Promise<{ questionId: string }>
}

export default async function QuestionDetailPage({ params }: QuestionDetailPageProps) {
  const { questionId } = await params
  const id = Number(questionId)

  if (!Number.isFinite(id) || id <= 0) notFound()

  return <QuestionDetailScreen questionId={id} />
}
