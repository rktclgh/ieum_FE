import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type {
  ChatRoomDetailResponse,
  ChatRoomSummaryResponse,
} from "@/features/chat/api/chat-types"

/** 낙관적 패치를 되돌리기 위한 type별 목록 캐시 스냅샷 */
type RoomsListSnapshot = [QueryKey, ChatRoomSummaryResponse[] | undefined][]

/** 목록 요약과 방 상세가 공유하는, 토글로 바뀌는 필드들 */
type RoomFlags = Pick<ChatRoomSummaryResponse, "pinned" | "notifyEnabled">

interface RoomPatch {
  roomId: number
  patch: Partial<RoomFlags>
}

// 알림·고정 토글을 서버 왕복 전에 반영한다. 목록 요약 캐시는 type별(chatKeys.rooms(type))로
// 나뉘어 있으므로 접두사 키로 매칭되는 캐시를 한 번에 패치하고, 롤백용 스냅샷을 돌려준다.
// 이미 로드된 캐시만 대상이 된다(undefined는 그대로 두어 초기 fetch의 로딩 상태를 건드리지 않음).
function patchRoomsInLoadedListCaches(
  queryClient: QueryClient,
  roomsListKey: readonly unknown[],
  patches: readonly RoomPatch[]
): RoomsListSnapshot {
  const snapshot = queryClient.getQueriesData<ChatRoomSummaryResponse[]>({
    queryKey: roomsListKey,
  })

  queryClient.setQueriesData<ChatRoomSummaryResponse[]>({ queryKey: roomsListKey }, (rooms) => {
    if (rooms === undefined) return rooms
    return rooms.map((room) => {
      const hit = patches.find((entry) => entry.roomId === room.roomId)
      return hit ? { ...room, ...hit.patch } : room
    })
  })

  return snapshot
}

function restoreRoomsListCaches(queryClient: QueryClient, snapshot: RoomsListSnapshot) {
  for (const [queryKey, rooms] of snapshot) {
    queryClient.setQueryData(queryKey, rooms)
  }
}

/** 낙관적 패치를 되돌리기 위한 방 상세 캐시 스냅샷 */
type RoomDetailSnapshot = [QueryKey, ChatRoomDetailResponse | undefined][]

// 방 상세도 함께 패치한다. 채팅방 사이드패널 헤더는 목록 요약이 아니라 상세를 읽으므로,
// 여기를 건너뛰면 요청이 끝난 뒤 리페치가 도착하기 전까지 헤더만 이전 상태로 남는다.
function patchRoomDetails(
  queryClient: QueryClient,
  roomKeyOf: (roomId: number) => readonly unknown[],
  patches: readonly RoomPatch[]
): RoomDetailSnapshot {
  const snapshot: RoomDetailSnapshot = []

  for (const { roomId, patch } of patches) {
    const queryKey = roomKeyOf(roomId)
    const current = queryClient.getQueryData<ChatRoomDetailResponse>(queryKey)
    snapshot.push([queryKey, current])
    if (current !== undefined) {
      queryClient.setQueryData<ChatRoomDetailResponse>(queryKey, { ...current, ...patch })
    }
  }

  return snapshot
}

function restoreRoomDetails(queryClient: QueryClient, snapshot: RoomDetailSnapshot) {
  for (const [queryKey, room] of snapshot) {
    queryClient.setQueryData(queryKey, room)
  }
}

export {
  patchRoomDetails,
  patchRoomsInLoadedListCaches,
  restoreRoomDetails,
  restoreRoomsListCaches,
}
export type { RoomDetailSnapshot, RoomPatch, RoomsListSnapshot }
