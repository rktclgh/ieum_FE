import { apiClient } from "@/lib/api/client"

import type {
  AddScheduleRequest,
  AddScheduleResponse,
  CalendarRange,
  CalendarResponse,
  MeetingSchedulesResponse,
} from "@/features/schedule/api/schedule-types"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getCalendar(range: CalendarRange = {}) {
  const { data } = await apiClient.get<CalendarResponse>("/api/v1/meetings/calendar", {
    params: range,
  })
  return data.items
}

async function getMeetingSchedules(meetingId: number, range: CalendarRange = {}) {
  const { data } = await apiClient.get<MeetingSchedulesResponse>(
    `/api/v1/meetings/${meetingId}/schedules`,
    { params: range }
  )
  return data.items
}

// 상태 변경 (CSRF 필요)

async function addSchedule(meetingId: number, body: AddScheduleRequest) {
  const { data } = await apiClient.post<AddScheduleResponse>(
    `/api/v1/meetings/${meetingId}/schedules`,
    body
  )
  return data
}

// 204 No Content
async function cancelSchedule(meetingId: number, scheduleId: number) {
  await apiClient.delete(`/api/v1/meetings/${meetingId}/schedules/${scheduleId}`)
}

export { getCalendar, getMeetingSchedules, addSchedule, cancelSchedule }
