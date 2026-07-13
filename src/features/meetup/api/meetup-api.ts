import { apiClient } from "@/lib/api/client"

import type {
  CreateMeetingRequest,
  CreateMeetingResponse,
  JoinMeetingResponse,
  MeetingDetailResponse,
  MeetingParticipant,
  MeetingParticipantsResponse,
} from "@/features/meetup/api/meetup-types"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getMeeting(meetingId: number) {
  const { data } = await apiClient.get<MeetingDetailResponse>(`/api/v1/meetings/${meetingId}`)
  return data
}

async function getParticipants(meetingId: number): Promise<MeetingParticipant[]> {
  const { data } = await apiClient.get<MeetingParticipantsResponse>(
    `/api/v1/meetings/${meetingId}/participants`
  )
  return data.items
}

// 상태 변경 (CSRF 필요)

async function createMeeting(body: CreateMeetingRequest) {
  const { data } = await apiClient.post<CreateMeetingResponse>("/api/v1/meetings", body)
  return data
}

async function joinMeeting(meetingId: number) {
  const { data } = await apiClient.post<JoinMeetingResponse>(`/api/v1/meetings/${meetingId}/join`)
  return data
}

async function leaveMeeting(meetingId: number) {
  await apiClient.post(`/api/v1/meetings/${meetingId}/leave`)
}

async function kickMember(meetingId: number, userId: number) {
  await apiClient.post(`/api/v1/meetings/${meetingId}/kick`, { userId })
}

export {
  getMeeting,
  getParticipants,
  createMeeting,
  joinMeeting,
  leaveMeeting,
  kickMember,
}
