import type { QueryClient } from "@tanstack/react-query"

import type { ChatRoomSummaryResponse, WsRoomEvent } from "@/features/chat/api/chat-types"

function isActiveRoomRemoval(event: WsRoomEvent, activeRoomId: number | null): boolean {
  return event.type === "remove" && activeRoomId !== null && event.roomId === activeRoomId
}

// 사용자 단위 remove 이벤트는 목록 화면이 마운트되지 않은 동안에도 열린 방에서 수신된다.
// 이미 로드된 type별 목록 캐시만 즉시 패치해, /chats로 돌아갈 때 제거된 방이 다시 보이지 않게 한다.
function removeRoomFromAllLoadedListCaches(
  queryClient: QueryClient,
  roomsListKey: readonly unknown[],
  roomId: number
) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: roomsListKey })) {
    const oldData = queryClient.getQueryData<ChatRoomSummaryResponse[]>(query.queryKey)
    if (oldData === undefined) continue

    queryClient.setQueryData<ChatRoomSummaryResponse[]>(
      query.queryKey,
      oldData.filter((room) => room.roomId !== roomId)
    )
  }
}

// 읽음 처리는 서버 read cursor가 정본이지만, 이미 로드된 목록 캐시는 즉시 unreadCount를
// 0으로 맞춰야 방에서 나와 목록으로 돌아갈 때 이전 뱃지가 다시 보이지 않는다.
function markRoomReadInLoadedListCaches(
  queryClient: QueryClient,
  roomsListKey: readonly unknown[],
  roomId: number
) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: roomsListKey })) {
    const oldData = queryClient.getQueryData<ChatRoomSummaryResponse[]>(query.queryKey)
    if (oldData === undefined) continue

    queryClient.setQueryData<ChatRoomSummaryResponse[]>(
      query.queryKey,
      oldData.map((room) => (room.roomId === roomId ? { ...room, unreadCount: 0 } : room))
    )
  }
}

export {
  isActiveRoomRemoval,
  markRoomReadInLoadedListCaches,
  removeRoomFromAllLoadedListCaches,
}
