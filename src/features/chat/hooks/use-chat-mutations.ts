"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createDirectRoom,
  leaveRoom,
  markRead,
  setNotify,
  setPinned,
} from "@/features/chat/api/chat-api"
import { chatKeys } from "@/features/chat/hooks/use-chat-queries"
import { deleteMeeting } from "@/features/meetup/api/meetup-api"
import { meetupKeys } from "@/features/meetup/hooks/use-meetup-queries"

// 방 목록 요약 쿼리는 type별(chatKeys.rooms(type))로 나뉘어 있어 접두사 키로 한 번에 무효화한다.
// 목록 요약(getRooms)에 unreadCount·pinned·notifyEnabled가 모두 담겨 있고,
// 각 방 상세(chatKeys.room)는 staleTime으로 유지되므로 목록만 무효화해도 N+1 상세 재조회가 일어나지 않는다.
const roomsListKey = [...chatKeys.all, "rooms"] as const

function useCreateDirectRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendId: number) => createDirectRoom(friendId),
    // 새 방이 목록에 등장 → 목록만 갱신
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsListKey }),
  })
}

function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: number) => markRead(roomId),
    // unreadCount는 목록 요약에만 반영 → 메시지/방 상세는 건드리지 않는다
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsListKey }),
  })
}

function useSetPinned() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, pinned }: { roomId: number; pinned: boolean }) => setPinned(roomId, pinned),
    // 고정 여부는 목록(정렬/플래그)과 해당 방 상세에 반영 → 메시지는 불필요
    onSuccess: (_data, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) })
    },
  })
}

function useSetNotify() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, enabled }: { roomId: number; enabled: boolean }) => setNotify(roomId, enabled),
    // 알림 설정은 목록(뮤트 표시)과 해당 방 상세에 반영 → 메시지는 불필요
    onSuccess: (_data, { roomId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsListKey }),
        queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) }),
      ]),
  })
}

function useLeaveRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: number) => leaveRoom(roomId),
    // 방이 목록에서 사라짐 → 목록 갱신 + 해당 방의 상세·메시지 캐시 제거
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.removeQueries({ queryKey: chatKeys.room(roomId) })
      queryClient.removeQueries({ queryKey: chatKeys.messages(roomId) })
    },
  })
}

function useDisbandMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ meetingId }: { meetingId: number; roomId: number }) => deleteMeeting(meetingId),
    // 모임 해체 → 연결 채팅방·모임 캐시를 함께 제거한다.
    onSuccess: (_data, { meetingId, roomId }) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.removeQueries({ queryKey: chatKeys.room(roomId) })
      queryClient.removeQueries({ queryKey: chatKeys.messages(roomId) })
      queryClient.removeQueries({ queryKey: meetupKeys.detail(meetingId) })
      queryClient.removeQueries({ queryKey: meetupKeys.participants(meetingId) })
    },
  })
}

export {
  useCreateDirectRoom,
  useMarkRead,
  useSetPinned,
  useSetNotify,
  useLeaveRoom,
  useDisbandMeeting,
}
