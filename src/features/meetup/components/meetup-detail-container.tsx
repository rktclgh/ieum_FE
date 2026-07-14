"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MeetupDetailSheet } from "@/features/meetup/components/meetup-detail-sheet"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import {
  useJoinMeeting,
  useLeaveMeeting,
} from "@/features/meetup/hooks/use-meetup-mutations"
import { adaptMeetingDetail } from "@/features/meetup/lib/meetup-adapter"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface MeetupDetailContainerProps {
  meetingId: number
  /** 시트를 닫을 때 호출. 없으면 라우트 뒤로가기(router.back). 지도 핀 오버레이에선 콜백으로 닫는다. */
  onClose?: () => void
}

/**
 * 모임 상세 컨테이너. 상세/참가자 조회 + 참가·탈퇴·강퇴·마감·취소 mutation 을 시트에 연결한다.
 * 라우트(/meetups/[meetingId])와 지도 핀 클릭 오버레이 양쪽에서 재사용한다.
 */
function MeetupDetailContainer({ meetingId, onClose }: MeetupDetailContainerProps) {
  const router = useRouter()
  const { messages, language } = useTranslation()

  const meetingQuery = useMeeting(meetingId)
  const detail = meetingQuery.data ? adaptMeetingDetail(meetingQuery.data, language) : null

  const join = useJoinMeeting(meetingId)
  const leave = useLeaveMeeting(meetingId)

  const [error, setError] = React.useState<string | null>(null)
  // 되돌리기 어려운 파괴적 액션(나가기/내보내기/마감/취소)은 실행 전 확인 다이얼로그를 거친다.
  const [confirm, setConfirm] = React.useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)
  const m = messages.meetup

  const pending = join.isPending || leave.isPending

  const run = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(getMeetupErrorMessage(err, messages))
    }
  }

  const close = () => (onClose ? onClose() : router.back())

  const handleJoin = () =>
    run(async () => {
      const { roomId } = await join.mutateAsync()
      router.replace(routes.chatRoom(roomId))
    })
  const handleLeave = () =>
    setConfirm({
      title: m.leaveConfirmTitle,
      description: m.leaveConfirmDescription,
      confirmLabel: m.leaveButton,
      onConfirm: () => run(async () => { await leave.mutateAsync(); close() }),
    })
  const handleEnterRoom = () => {
    if (detail) router.push(routes.chatRoom(detail.roomId))
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
    <>
      <MeetupDetailSheet
        open
        onOpenChange={(next) => {
          if (!next) close()
        }}
        detail={detail}
        pending={pending}
        error={error}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onEnterRoom={handleEnterRoom}
      />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null)
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        cancelLabel={m.confirmCancelLabel}
        confirmLabel={confirm?.confirmLabel ?? ""}
        onConfirm={() => {
          confirm?.onConfirm()
          setConfirm(null)
        }}
      />
    </>
  )
}

export { MeetupDetailContainer }
