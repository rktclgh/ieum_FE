"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { addSchedule, cancelSchedule } from "@/features/schedule/api/schedule-api"
import type { AddScheduleRequest } from "@/features/schedule/api/schedule-types"
import { scheduleKeys } from "@/features/schedule/hooks/use-schedule-queries"

// 일정 추가. 성공 시 캘린더/모임 일정 캐시를 무효화해 최신 상태로 갱신한다.
function useAddSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, body }: { meetingId: number; body: AddScheduleRequest }) =>
      addSchedule(meetingId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}

// 일정 취소(호스트 전용). 성공 시 캘린더/모임 일정 캐시를 무효화한다.
function useCancelSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, scheduleId }: { meetingId: number; scheduleId: number }) =>
      cancelSchedule(meetingId, scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}

export { useAddSchedule, useCancelSchedule }
