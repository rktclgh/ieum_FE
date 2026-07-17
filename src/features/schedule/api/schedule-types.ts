// 백엔드 모임(Meeting) 캘린더/일정 API 응답 타입. api-reference.md §10 (10-2/10-5/10-7/10-8) 기준.

// 일정(schedule) status는 모임(meeting) status와 다른 집합이다.
// 실 백엔드는 생성 직후 "scheduled"를 내려준다(2026-07-12 실측). 문서 §10 enum엔
// 모임 status(open/closed/cancelled)만 있고 일정 status는 미기재라, 확인된 "scheduled"를
// 포함하고 종료 상태는 완만하게 열어둔다. (백엔드 문서에 일정 status enum 명시 요청 필요)
type ScheduleStatus = "scheduled" | "closed" | "cancelled" | (string & {})

// Question/Meeting 공용 위치 값객체. address 필수, 나머지는 선택.
interface LocationSnapshot {
  lat: number
  lng: number
  address: string
  detailAddress?: string
  label?: string
}

// 10-2 GET /meetings/calendar 항목
interface CalendarItem {
  meetingId: number
  scheduleId: number
  title: string
  location: LocationSnapshot
  startsAt: string
  endsAt: string | null
  status: ScheduleStatus
  roomId: number
  isHost: boolean
}

// 모임 채팅 일정 관리 GET /meetings/{id}/schedules 항목.
// 권한은 화면에서 재계산하지 않고 서버가 내려준 capability만 사용한다.
interface MeetingScheduleItem {
  scheduleId: number
  title: string
  locationName: string
  startsAt: string
  endsAt: string | null
  status: ScheduleStatus
  createdByUserId: number | null
  canEdit: boolean
  canDelete: boolean
  canReport: boolean
}

interface CalendarResponse {
  items: CalendarItem[]
}

interface MeetingSchedulesResponse {
  items: MeetingScheduleItem[]
}

// 조회 기간 필터(둘 다 선택). YYYY-MM-DD 문자열로 전달한다.
interface CalendarRange {
  from?: string
  to?: string
}

// 모임 채팅 일정 조회는 controller의 OffsetDateTime 바인딩에 맞춰 KST offset을 포함한다.
interface MeetingScheduleRange {
  from?: string
  to?: string
}

// 모임 채팅 일정 생성/수정 요청. 위치의 좌표는 모임 장소 picker에서만 쓰고,
// 일정 API에는 사람이 읽을 수 있는 이름만 전달한다.
interface ScheduleEditorRequest {
  title: string
  locationName: string
  startsAt: string
  endsAt?: string
}

// 기존 사용처와의 이름 호환을 유지한다.
type AddScheduleRequest = ScheduleEditorRequest

interface AddScheduleResponse {
  scheduleId: number
}

interface ScheduleReportRequest {
  reason: "spam" | "ad" | "abuse" | "obscene" | "harassment" | "etc"
  detail?: string
}

interface ScheduleReportResponse {
  reportId: number
}

export type {
  ScheduleStatus,
  LocationSnapshot,
  CalendarItem,
  MeetingScheduleItem,
  CalendarResponse,
  MeetingSchedulesResponse,
  CalendarRange,
  MeetingScheduleRange,
  ScheduleEditorRequest,
  AddScheduleRequest,
  AddScheduleResponse,
  ScheduleReportRequest,
  ScheduleReportResponse,
}
