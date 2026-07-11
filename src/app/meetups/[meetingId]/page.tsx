import { notFound } from "next/navigation"

import { MeetupDetailContainer } from "@/features/meetup/components/meetup-detail-container"

interface MeetupDetailPageProps {
  params: Promise<{ meetingId: string }>
}

export default async function MeetupDetailPage({ params }: MeetupDetailPageProps) {
  const { meetingId } = await params
  const parsed = Number(meetingId)

  if (!Number.isFinite(parsed) || parsed <= 0) notFound()

  return <MeetupDetailContainer meetingId={parsed} />
}
