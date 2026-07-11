"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { MeetupDetailSheet } from "@/features/meetup/components/meetup-detail-sheet"
import {
  useMeeting,
  useMeetingParticipants,
} from "@/features/meetup/hooks/use-meetup-queries"
import {
  useCancelMeeting,
  useCloseMeeting,
  useJoinMeeting,
  useKickMember,
  useLeaveMeeting,
} from "@/features/meetup/hooks/use-meetup-mutations"
import { adaptMeetingDetail, adaptParticipant } from "@/features/meetup/lib/meetup-adapter"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"

interface MeetupDetailContainerProps {
  meetingId: number
}

/**
 * 모임 상세 컨테이너. 상세/참가자 조회 + 참가·탈퇴·강퇴·마감·취소 mutation 을 시트에 연결한다.
 * 지도 핀 클릭 진입(#31)은 아직 미연동이라, 직접 라우트(/meetups/[meetingId])로 진입해 검증한다.
 */
function MeetupDetailContainer({ meetingId }: MeetupDetailContainerProps) {
  const router = useRouter()
  const { messages, language } = useTranslation()

  const meetingQuery = useMeeting(meetingId)
  const detail = meetingQuery.data ? adaptMeetingDetail(meetingQuery.data, language) : null
  const isHost = detail?.isHost ?? false

  const participantsQuery = useMeetingParticipants(meetingId, isHost)
  const participants = React.useMemo(
    () => (participantsQuery.data ?? []).map(adaptParticipant),
    [participantsQuery.data]
  )

  const join = useJoinMeeting(meetingId)
  const leave = useLeaveMeeting(meetingId)
  const kick = useKickMember(meetingId)
  const closeMeeting = useCloseMeeting(meetingId)
  const cancel = useCancelMeeting(meetingId)

  const [error, setError] = React.useState<string | null>(null)

  const pending =
    join.isPending ||
    leave.isPending ||
    kick.isPending ||
    closeMeeting.isPending ||
    cancel.isPending

  const run = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(getMeetupErrorMessage(err, messages))
    }
  }

  const close = () => router.back()

  const handleJoin = () =>
    run(async () => {
      const { roomId } = await join.mutateAsync()
      router.replace(`/chats/${roomId}`)
    })
  const handleLeave = () => run(async () => { await leave.mutateAsync(); close() })
  const handleKick = (userId: number) => run(() => kick.mutateAsync(userId))
  const handleCloseMeeting = () => run(() => closeMeeting.mutateAsync())
  const handleCancel = () => run(async () => { await cancel.mutateAsync(); close() })
  const handleEnterRoom = () => {
    if (detail) router.push(`/chats/${detail.roomId}`)
  }

  if (meetingQuery.isError) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center p-6">
        <p className="text-body-regular-14 text-gray-500">
          {getMeetupErrorMessage(meetingQuery.error, messages)}
        </p>
      </div>
    )
  }

  return (
    <MeetupDetailSheet
      open
      onOpenChange={(next) => {
        if (!next) close()
      }}
      detail={detail}
      participants={participants}
      pending={pending}
      error={error}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onCloseMeeting={handleCloseMeeting}
      onCancel={handleCancel}
      onKick={handleKick}
      onEnterRoom={handleEnterRoom}
    />
  )
}

export { MeetupDetailContainer }
