import { apiClient } from "@/lib/api/client"

import type {
  AddScheduleRequest,
  AddScheduleResponse,
  CalendarRange,
  CalendarResponse,
  MeetingScheduleItem,
  MeetingScheduleRange,
  MeetingSchedulesResponse,
  ScheduleEditorRequest,
  ScheduleReportRequest,
  ScheduleReportResponse,
} from "@/features/schedule/api/schedule-types"
import { meetingSchedulePath, scheduleReportPath } from "@/features/schedule/lib/schedule-contract"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getCalendar(range: CalendarRange = {}) {
  const { data } = await apiClient.get<CalendarResponse>("/api/v1/meetings/calendar", {
    params: range,
  })
  return data.items
}

async function getMeetingSchedules(meetingId: number, range: MeetingScheduleRange = {}) {
  const { data } = await apiClient.get<MeetingSchedulesResponse>(
    meetingSchedulePath(meetingId),
    { params: range }
  )
  return data.items
}

// 상태 변경 (CSRF 필요)

async function addSchedule(meetingId: number, body: AddScheduleRequest) {
  const { data } = await apiClient.post<AddScheduleResponse>(
    meetingSchedulePath(meetingId),
    body
  )
  return data
}

async function updateSchedule(meetingId: number, scheduleId: number, body: ScheduleEditorRequest) {
  const { data } = await apiClient.patch<MeetingScheduleItem>(
    meetingSchedulePath(meetingId, scheduleId),
    body
  )
  return data
}

// 204 No Content
async function deleteSchedule(meetingId: number, scheduleId: number) {
  await apiClient.delete(meetingSchedulePath(meetingId, scheduleId))
}

async function reportSchedule(meetingId: number, scheduleId: number, body: ScheduleReportRequest) {
  const { data } = await apiClient.post<ScheduleReportResponse>(
    scheduleReportPath(meetingId, scheduleId),
    body
  )
  return data
}

export {
  getCalendar,
  getMeetingSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  reportSchedule,
}
