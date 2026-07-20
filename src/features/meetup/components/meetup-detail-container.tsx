"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { MeetupDetailCard } from "@/features/meetup/components/meetup-detail-card"
import { MeetupDetailSheet } from "@/features/meetup/components/meetup-detail-sheet"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import { useJoinMeeting } from "@/features/meetup/hooks/use-meetup-mutations"
import { adaptMeetingDetail } from "@/features/meetup/lib/meetup-adapter"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface MeetupDetailContainerProps {
  meetingId: number
  /** 시트를 닫을 때 호출. 없으면 라우트 뒤로가기(router.back). 지도 핀 오버레이에선 콜백으로 닫는다. */
  onClose?: () => void
  /**
   * 렌더 형태.
   * - "sheet": 자체 BottomSheet 로 연다(기본).
   * - "card": 본문만 렌더한다. 겹친 핀 캐러셀처럼 바깥에 이미 BottomSheet 이 있을 때 쓴다.
   */
  variant?: "sheet" | "card"
}

/**
 * 모임 상세 컨테이너. 상세/참가자 조회 + 참가·탈퇴·강퇴·마감·취소 mutation 을 시트에 연결한다.
 * 라우트(/meetups/detail/?meetingId=...)와 지도 핀 클릭 오버레이 양쪽에서 재사용한다.
 */
function MeetupDetailContainer({
  meetingId,
  onClose,
  variant = "sheet",
}: MeetupDetailContainerProps) {
  const router = useRouter()
  const { messages, language } = useTranslation()

  const meetingQuery = useMeeting(meetingId)
  const detail = meetingQuery.data ? adaptMeetingDetail(meetingQuery.data, language) : null

  const join = useJoinMeeting(meetingId)

  const [error, setError] = React.useState<string | null>(null)

  const pending = join.isPending

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
  const handleEnterRoom = () => {
    if (detail) router.push(routes.chatRoom(detail.roomId))
  }

  if (meetingQuery.isError) {
    const errorMessage = getMeetupErrorMessage(meetingQuery.error, messages)
    // 카드 모드에선 캐러셀 슬라이드 안에 들어가므로 전체 화면을 차지하지 않는다.
    return variant === "card" ? (
      <p className="w-full py-6 text-center text-body-regular-14 text-gray-500">{errorMessage}</p>
    ) : (
      <div className="flex min-h-dvh w-full items-center justify-center p-6">
        <p className="text-body-regular-14 text-gray-500">{errorMessage}</p>
      </div>
    )
  }

  if (variant === "card") {
    // 로딩 중에도 슬라이드 높이를 유지해, 캐러셀 스크롤이 도착 후 튀지 않게 한다.
    if (!detail) return <div className="h-56 w-full animate-pulse rounded-2xl bg-gray-100" />
    return (
      <MeetupDetailCard
        detail={detail}
        pending={pending}
        error={error}
        onJoin={handleJoin}
        onEnterRoom={handleEnterRoom}
      />
    )
  }

  return (
    <MeetupDetailSheet
      open
      onOpenChange={(next) => {
        if (!next) close()
      }}
      detail={detail}
      pending={pending}
      error={error}
      onJoin={handleJoin}
      onEnterRoom={handleEnterRoom}
    />
  )
}

export { MeetupDetailContainer }
