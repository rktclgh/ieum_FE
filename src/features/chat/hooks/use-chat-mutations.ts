"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createDirectRoom,
  leaveRoom,
  markRead,
  registerChatNotice,
  setChatNoticePin,
  setNotify,
  setPinned,
  unsetChatNoticePin,
} from "@/features/chat/api/chat-api"
import type { LeaveChatRoomTarget } from "@/features/chat/api/chat-types"
import { chatKeys } from "@/features/chat/hooks/use-chat-queries"
import { executeLeaveChatRoom } from "@/features/chat/lib/chat-leave"
import { executeSetPinned, resolvePinOperations, type PinRequest } from "@/features/chat/lib/chat-pin"
import {
  executeSetChatNoticePinned,
  type ChatNoticePinRequest,
} from "@/features/chat/lib/chat-notice"
import {
  patchRoomDetails,
  patchRoomsInLoadedListCaches,
  restoreRoomDetails,
  restoreRoomsListCaches,
} from "@/features/chat/lib/chat-room-cache"
import { deleteMeeting, leaveMeeting } from "@/features/meetup/api/meetup-api"
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

function useRegisterChatNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, messageId }: { roomId: number; messageId: number }) =>
      registerChatNotice(roomId, messageId),
    onSettled: (_data, _error, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.notices(roomId) })
    },
  })
}

function useSetChatNoticePinned() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ChatNoticePinRequest) =>
      executeSetChatNoticePinned(request, {
        pinNotice: setChatNoticePin,
        unpinNotice: unsetChatNoticePin,
      }),
    onSettled: (_data, _error, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.notices(roomId) })
    },
  })
}

function useSetPinned() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: PinRequest) => executeSetPinned(request, { setPinned }),
    // 고정 순서를 서버 왕복 전에 반영한다. 정렬이 즉시 바뀌어야 목록의 재정렬
    // 애니메이션(useFlipReorder)이 지연 없이 시작된다.
    onMutate: async (request) => {
      const patches = resolvePinOperations(request).map(({ roomId, pinned }) => ({
        roomId,
        patch: { pinned },
      }))
      await queryClient.cancelQueries({ queryKey: roomsListKey })
      return {
        rooms: patchRoomsInLoadedListCaches(queryClient, roomsListKey, patches),
        details: patchRoomDetails(queryClient, chatKeys.room, patches),
      }
    },
    onError: (_error, _request, snapshot) => {
      if (!snapshot) return
      restoreRoomsListCaches(queryClient, snapshot.rooms)
      restoreRoomDetails(queryClient, snapshot.details)
    },
    // 고정 여부는 목록(정렬/플래그)과 해당 방 상세에 반영 → 메시지는 불필요.
    // 실패해도 서버 상태로 수렴시켜야 하므로 onSettled에서 무효화한다.
    onSettled: (_data, _error, { roomId, replacingRoomId }) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) })
      if (replacingRoomId !== undefined && replacingRoomId !== roomId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.room(replacingRoomId) })
      }
    },
  })
}

function useSetNotify() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, enabled }: { roomId: number; enabled: boolean }) => setNotify(roomId, enabled),
    // 뮤트 표시를 서버 왕복 전에 목록과 방 상세 양쪽에 반영한다. 왕복 동안 목록이 흔들리지
    // 않고, 실패 시 스냅샷으로 되돌린 뒤 onSettled의 무효화가 서버 상태로 수렴시킨다.
    onMutate: async ({ roomId, enabled }) => {
      const patches = [{ roomId, patch: { notifyEnabled: enabled } }]
      await queryClient.cancelQueries({ queryKey: roomsListKey })
      return {
        rooms: patchRoomsInLoadedListCaches(queryClient, roomsListKey, patches),
        details: patchRoomDetails(queryClient, chatKeys.room, patches),
      }
    },
    onError: (_error, _variables, snapshot) => {
      if (!snapshot) return
      restoreRoomsListCaches(queryClient, snapshot.rooms)
      restoreRoomDetails(queryClient, snapshot.details)
    },
    // 알림 설정은 목록(뮤트 표시)과 해당 방 상세에 반영 → 메시지는 불필요
    onSettled: (_data, _error, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.invalidateQueries({ queryKey: chatKeys.room(roomId) })
    },
  })
}

function useLeaveChatRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (target: LeaveChatRoomTarget) =>
      executeLeaveChatRoom(target, { leaveRoom, leaveMeeting }),
    // 방이 목록에서 사라짐 → 목록 갱신 + 해당 방의 상세·메시지 캐시 제거.
    // group 이탈 뒤에는 해당 모임 조회 권한이 없으므로 refetch하지 않고 캐시를 제거한다.
    onSuccess: (_data, target) => {
      queryClient.invalidateQueries({ queryKey: roomsListKey })
      queryClient.removeQueries({ queryKey: chatKeys.room(target.roomId) })
      queryClient.removeQueries({ queryKey: chatKeys.messages(target.roomId) })
      if (target.roomType === "group" && target.meetingId != null) {
        queryClient.removeQueries({ queryKey: meetupKeys.detail(target.meetingId) })
        queryClient.removeQueries({ queryKey: meetupKeys.participants(target.meetingId) })
      }
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
  useRegisterChatNotice,
  useSetChatNoticePinned,
  useSetPinned,
  useSetNotify,
  useLeaveChatRoom,
  useDisbandMeeting,
}
