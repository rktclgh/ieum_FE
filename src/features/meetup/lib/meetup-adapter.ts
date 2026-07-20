import { resolveFileUrl } from "@/lib/api/file-url"
import { formatKstDateOnlyLabel, formatKstDateTimeLabel } from "@/lib/date/kst"
import type {
  MeetingDetailResponse,
  MeetingMyStatus,
  MeetingParticipant,
  MeetingStatus,
} from "@/features/meetup/api/meetup-types"

// 상세 시트/페이지가 소비하는 모임 뷰 모델.
interface MeetupDetailView {
  meetingId: number
  roomId: number
  title: string
  /** 표시용 일시 라벨. 예정 일정이 없으면 빈 문자열(호출부가 폴백 라벨 표시). */
  dateLabel: string
  /** 장소 라벨: location.label 우선, 없으면 주소. */
  locationLabel: string
  participantCount: number
  maxMembers: number
  description: string
  imageUrl?: string
  status: MeetingStatus
  myStatus: MeetingMyStatus
  isHost: boolean
}

interface MeetupParticipantView {
  userId: number
  nickname: string
  avatarSrc?: string
  isHost: boolean
}

function adaptMeetingDetail(
  detail: MeetingDetailResponse,
  locale: string,
  timeUndecidedLabel?: string
): MeetupDetailView {
  const startsAt = detail.nextSchedule?.startsAt ?? detail.meetingAt
  const isTimeUndecided = Boolean(detail.nextSchedule?.timeUndecided) && timeUndecidedLabel !== undefined
  const dateLabel = !startsAt
    ? ""
    : isTimeUndecided
      ? `${formatKstDateOnlyLabel(startsAt)} ${timeUndecidedLabel}`
      : formatKstDateTimeLabel(startsAt, locale)
  return {
    meetingId: detail.meetingId,
    roomId: detail.roomId,
    title: detail.title,
    dateLabel,
    locationLabel: detail.location.label || detail.location.address,
    participantCount: detail.participantCount,
    maxMembers: detail.maxMembers,
    description: detail.content ?? "",
    imageUrl: resolveFileUrl(detail.imageUrl),
    status: detail.status,
    myStatus: detail.myStatus,
    isHost: detail.myStatus === "host",
  }
}

function adaptParticipant(participant: MeetingParticipant): MeetupParticipantView {
  return {
    userId: participant.userId,
    nickname: participant.nickname,
    avatarSrc: resolveFileUrl(participant.profileImageUrl),
    isHost: participant.isHost,
  }
}

export { adaptMeetingDetail, adaptParticipant }
export type { MeetupDetailView, MeetupParticipantView }
