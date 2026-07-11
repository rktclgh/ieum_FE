"use client"

import { useQueries, useQuery } from "@tanstack/react-query"

import { getMessages, getRoom, getRooms } from "@/features/chat/api/chat-api"
import type { RoomType } from "@/features/chat/api/chat-types"
import { adaptMessage, adaptRoomSummary, type ChatListEntry } from "@/features/chat/lib/chat-adapter"
import { useMe } from "@/features/session/hooks/use-me"

const chatKeys = {
  all: ["chat"] as const,
  rooms: (type?: RoomType) => [...chatKeys.all, "rooms", type ?? "all"] as const,
  room: (roomId: number) => [...chatKeys.all, "room", roomId] as const,
  messages: (roomId: number) => [...chatKeys.all, "messages", roomId] as const,
}

// 방 목록. 백엔드 summary엔 제목이 없어, 각 방 상세(members)를 병렬 조회해 제목/아바타를 파생한다.
function useChatRoomsView(type?: RoomType) {
  const { data: me } = useMe()
  const myUserId = me?.userId ?? -1

  const roomsQuery = useQuery({
    queryKey: chatKeys.rooms(type),
    queryFn: () => getRooms(type),
    enabled: myUserId > 0,
  })

  const rooms = roomsQuery.data ?? []

  const detailQueries = useQueries({
    queries: rooms.map((room) => ({
      queryKey: chatKeys.room(room.roomId),
      queryFn: () => getRoom(room.roomId),
      staleTime: 60 * 1000,
    })),
  })

  const entries: ChatListEntry[] = rooms.map((room, index) =>
    adaptRoomSummary(room, detailQueries[index]?.data, myUserId)
  )

  return {
    entries,
    isLoading: roomsQuery.isLoading,
    isError: roomsQuery.isError,
    refetch: roomsQuery.refetch,
  }
}

function useChatRoom(roomId: number) {
  return useQuery({
    queryKey: chatKeys.room(roomId),
    queryFn: () => getRoom(roomId),
  })
}

// 최근 메시지 한 페이지(최대 50개). 서버는 최신순으로 내려주므로 화면 표시를 위해 오래된→최신으로 뒤집는다.
function useChatMessages(roomId: number) {
  const { data: me } = useMe()
  const myUserId = me?.userId ?? -1

  const query = useQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: () => getMessages(roomId),
    enabled: myUserId > 0,
  })

  const messages = query.data
    ? [...query.data.items].reverse().map((message) => adaptMessage(message, myUserId))
    : []

  return { messages, isLoading: query.isLoading, isError: query.isError }
}

export { chatKeys, useChatRoomsView, useChatRoom, useChatMessages }
