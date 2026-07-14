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

// 10-5 GET /meetings/{id}/schedules 항목
interface MeetingScheduleItem {
  scheduleId: number
  startsAt: string
  endsAt: string | null
  status: ScheduleStatus
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

// 10-7 POST /meetings/{id}/schedules 요청/응답
interface AddScheduleRequest {
  startsAt: string
  endsAt?: string
}

interface AddScheduleResponse {
  scheduleId: number
}

export type {
  ScheduleStatus,
  LocationSnapshot,
  CalendarItem,
  MeetingScheduleItem,
  CalendarResponse,
  MeetingSchedulesResponse,
  CalendarRange,
  AddScheduleRequest,
  AddScheduleResponse,
}
