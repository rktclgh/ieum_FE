"use client"

import { useQuery } from "@tanstack/react-query"

import { getMeeting, getParticipants } from "@/features/meetup/api/meetup-api"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"

const meetupKeys = {
  all: ["meetup"] as const,
  detail: (meetingId: number) => [...meetupKeys.all, "detail", meetingId] as const,
  participants: (meetingId: number) => [...meetupKeys.all, "participants", meetingId] as const,
}

function useMeeting(meetingId: number, enabled = true) {
  return useQuery({
    queryKey: meetupKeys.detail(meetingId),
    queryFn: () => getMeeting(meetingId),
    enabled: enabled && Number.isFinite(meetingId) && meetingId > 0,
    meta: PUBLIC_QUERY_META,
  })
}

function useMeetingParticipants(meetingId: number, enabled = true) {
  return useQuery({
    queryKey: meetupKeys.participants(meetingId),
    queryFn: () => getParticipants(meetingId),
    enabled: enabled && Number.isFinite(meetingId) && meetingId > 0,
    meta: PUBLIC_QUERY_META,
  })
}

export { meetupKeys, useMeeting, useMeetingParticipants }
