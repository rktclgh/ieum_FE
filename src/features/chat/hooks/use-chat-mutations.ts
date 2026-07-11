"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createDirectRoom,
  disbandRoom,
  leaveRoom,
  markRead,
  setNotify,
  setPinned,
} from "@/features/chat/api/chat-api"
import { chatKeys } from "@/features/chat/hooks/use-chat-queries"

// 상태 변경 성공 시 채팅 관련 쿼리를 무효화해 목록/방을 갱신한다.
function useInvalidateChat() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: chatKeys.all })
}

function useCreateDirectRoom() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: (friendId: number) => createDirectRoom(friendId),
    onSuccess: invalidate,
  })
}

function useMarkRead() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: (roomId: number) => markRead(roomId),
    onSuccess: invalidate,
  })
}

function useSetPinned() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: ({ roomId, pinned }: { roomId: number; pinned: boolean }) => setPinned(roomId, pinned),
    onSuccess: invalidate,
  })
}

function useSetNotify() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: ({ roomId, enabled }: { roomId: number; enabled: boolean }) => setNotify(roomId, enabled),
    onSuccess: invalidate,
  })
}

function useLeaveRoom() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: (roomId: number) => leaveRoom(roomId),
    onSuccess: invalidate,
  })
}

function useDisbandRoom() {
  const invalidate = useInvalidateChat()
  return useMutation({
    mutationFn: (roomId: number) => disbandRoom(roomId),
    onSuccess: invalidate,
  })
}

export {
  useCreateDirectRoom,
  useMarkRead,
  useSetPinned,
  useSetNotify,
  useLeaveRoom,
  useDisbandRoom,
}
