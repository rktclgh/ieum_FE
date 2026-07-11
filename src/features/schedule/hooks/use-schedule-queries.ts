"use client"

import { useQuery } from "@tanstack/react-query"

import { useTranslation } from "@/lib/i18n/use-translation"
import { getCalendar, getMeetingSchedules } from "@/features/schedule/api/schedule-api"
import type { CalendarRange } from "@/features/schedule/api/schedule-types"
import { adaptCalendarItem } from "@/features/schedule/lib/schedule-adapter"

const scheduleKeys = {
  all: ["schedules"] as const,
  calendar: (range: CalendarRange) => [...scheduleKeys.all, "calendar", range] as const,
  meeting: (meetingId: number, range: CalendarRange) =>
    [...scheduleKeys.all, "meeting", meetingId, range] as const,
}

// 기간(월)별 캘린더 조회. 응답 항목을 UI 모델(ScheduleEntry)로 변환한다.
function useCalendar(range: CalendarRange) {
  const { language } = useTranslation()
  return useQuery({
    queryKey: scheduleKeys.calendar(range),
    queryFn: () => getCalendar(range),
    select: (items) => items.map((item) => adaptCalendarItem(item, language)),
  })
}

function useMeetingSchedules(meetingId: number, range: CalendarRange = {}) {
  return useQuery({
    queryKey: scheduleKeys.meeting(meetingId, range),
    queryFn: () => getMeetingSchedules(meetingId, range),
  })
}

export { scheduleKeys, useCalendar, useMeetingSchedules }
