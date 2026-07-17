"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  addSchedule,
  deleteSchedule,
  updateSchedule,
} from "@/features/schedule/api/schedule-api"
import type { ScheduleEditorRequest } from "@/features/schedule/api/schedule-types"
import { scheduleKeys } from "@/features/schedule/hooks/use-schedule-queries"

function invalidateMeetingSchedules(queryClient: ReturnType<typeof useQueryClient>, meetingId: number) {
  return queryClient.invalidateQueries({ queryKey: scheduleKeys.meetingAll(meetingId) })
}

// 생성/수정/삭제는 해당 모임의 월별 일정 캐시만 갱신한다. 전역 캘린더는 이 화면의 정본이 아니다.
function useCreateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, body }: { meetingId: number; body: ScheduleEditorRequest }) =>
      addSchedule(meetingId, body),
    onSuccess: (_, { meetingId }) => invalidateMeetingSchedules(queryClient, meetingId),
  })
}

function useUpdateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, scheduleId, body }: { meetingId: number; scheduleId: number; body: ScheduleEditorRequest }) =>
      updateSchedule(meetingId, scheduleId, body),
    onSuccess: (_, { meetingId }) => invalidateMeetingSchedules(queryClient, meetingId),
  })
}

function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId, scheduleId }: { meetingId: number; scheduleId: number }) =>
      deleteSchedule(meetingId, scheduleId),
    onSuccess: (_, { meetingId }) => invalidateMeetingSchedules(queryClient, meetingId),
  })
}

export { invalidateMeetingSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule }
