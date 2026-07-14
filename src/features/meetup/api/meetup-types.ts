// 백엔드 모임(Meeting) API 응답/요청 타입. 계약 출처: ieum_BE/docs/api-reference.md §10.
// id 류는 number, 시각은 ISO-8601(오프셋 포함) 문자열.

// Question/Meeting 공용 위치 값객체. address 필수(≤255), 나머지 선택.
// 좌표는 한국 서비스 영역(lat 33.0~39.0, lng 124.0~132.0)으로 제한된다.
interface LocationSnapshot {
  lat: number
  lng: number
  address: string
  detailAddress?: string
  label?: string
}

type MeetingType = "one_time" | "recurring"
type MeetingStatus = "open" | "closed" | "cancelled"
// 호스트면 "host", 참가 상태(joined/left/kicked) 또는 미참가 "none".
type MeetingMyStatus = "host" | "joined" | "left" | "kicked" | "none"

interface MeetingScheduleInput {
  startsAt: string
  endsAt?: string
}

// POST /meetings 요청 바디.
interface CreateMeetingRequest {
  title: string
  content?: string
  type: MeetingType
  location: LocationSnapshot
  schedule: MeetingScheduleInput
  recurrenceRule?: string
  maxMembers: number
  imageFileId?: string
}

// POST /meetings 응답.
interface CreateMeetingResponse {
  meetingId: number
  pinId: number
  roomId: number
  firstScheduleId?: number
}

interface MeetingHost {
  userId: number
  nickname: string
  profileImageUrl: string | null
}

interface MeetingSchedule {
  scheduleId: number
  startsAt: string
  endsAt?: string | null
  status?: string
}

// GET /meetings/{id} 응답. placeName 필드는 없음(location 으로 통합).
interface MeetingDetailResponse {
  meetingId: number
  pinId: number
  roomId: number
  title: string
  content: string | null
  meetingAt: string | null
  type: MeetingType
  active: boolean
  nextSchedule: MeetingSchedule | null
  recurrenceRule: string | null
  status: MeetingStatus
  maxMembers: number
  participantCount: number
  host: MeetingHost
  imageUrl: string | null
  thumbnailUrl: string | null
  location: LocationSnapshot
  myStatus: MeetingMyStatus
  createdAt: string
}

interface MeetingParticipant {
  userId: number
  nickname: string
  profileImageUrl: string | null
  isHost: boolean
  joinedAt: string
}

// GET /meetings/{id}/participants 응답(items 래핑).
interface MeetingParticipantsResponse {
  items: MeetingParticipant[]
}

// POST /meetings/{id}/join 응답.
interface JoinMeetingResponse {
  roomId: number
}

export type {
  LocationSnapshot,
  MeetingType,
  MeetingStatus,
  MeetingMyStatus,
  MeetingScheduleInput,
  CreateMeetingRequest,
  CreateMeetingResponse,
  MeetingHost,
  MeetingSchedule,
  MeetingDetailResponse,
  MeetingParticipant,
  MeetingParticipantsResponse,
  JoinMeetingResponse,
}
