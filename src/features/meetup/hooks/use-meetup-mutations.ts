"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelMeeting,
  closeMeeting,
  createMeeting,
  joinMeeting,
  kickMember,
  leaveMeeting,
} from "@/features/meetup/api/meetup-api"
import type { CreateMeetingRequest } from "@/features/meetup/api/meetup-types"
import { meetupKeys } from "@/features/meetup/hooks/use-meetup-queries"

// 모임 상태 변경 성공 시 갱신할 캐시: 해당 모임 상세/참가자, 지도 핀, 채팅방 목록.
// 지도 핀(#31)·채팅방은 아직 이 키를 쓰지 않을 수 있으나, 무효화는 무해하며 연동 시 자동 반영된다.
function useMeetupInvalidate() {
  const queryClient = useQueryClient()
  return (meetingId?: number) => {
    if (meetingId) {
      queryClient.invalidateQueries({ queryKey: meetupKeys.detail(meetingId) })
      queryClient.invalidateQueries({ queryKey: meetupKeys.participants(meetingId) })
    } else {
      queryClient.invalidateQueries({ queryKey: meetupKeys.all })
    }
    queryClient.invalidateQueries({ queryKey: ["pins"] })
    queryClient.invalidateQueries({ queryKey: ["chat"] })
  }
}

function useCreateMeeting() {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: (body: CreateMeetingRequest) => createMeeting(body),
    onSuccess: () => invalidate(),
  })
}

function useJoinMeeting(meetingId: number) {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: () => joinMeeting(meetingId),
    onSuccess: () => invalidate(meetingId),
  })
}

function useLeaveMeeting(meetingId: number) {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: () => leaveMeeting(meetingId),
    onSuccess: () => invalidate(meetingId),
  })
}

function useKickMember(meetingId: number) {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: (userId: number) => kickMember(meetingId, userId),
    onSuccess: () => invalidate(meetingId),
  })
}

function useCloseMeeting(meetingId: number) {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: () => closeMeeting(meetingId),
    onSuccess: () => invalidate(meetingId),
  })
}

function useCancelMeeting(meetingId: number) {
  const invalidate = useMeetupInvalidate()
  return useMutation({
    mutationFn: () => cancelMeeting(meetingId),
    onSuccess: () => invalidate(meetingId),
  })
}

export {
  useCreateMeeting,
  useJoinMeeting,
  useLeaveMeeting,
  useKickMember,
  useCloseMeeting,
  useCancelMeeting,
}
