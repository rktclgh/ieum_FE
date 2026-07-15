"use client"

import { useQueries, useQuery } from "@tanstack/react-query"

import { getMessages, getRoom, getRooms } from "@/features/chat/api/chat-api"
import type { RoomType } from "@/features/chat/api/chat-types"
import { adaptMessage, adaptRoomSummary, type ChatListEntry } from "@/features/chat/lib/chat-adapter"
import {
  resolveChatSessionAccess,
  type ChatSessionAccess,
} from "@/features/chat/lib/chat-session"
import { getMeeting } from "@/features/meetup/api/meetup-api"
import { meetupKeys } from "@/features/meetup/hooks/use-meetup-queries"
import { getQuestion } from "@/features/question/api/question-api"
import { questionKeys } from "@/features/question/hooks/use-question-queries"
import { PUBLIC_QUERY_META } from "@/features/session/lib/session-cache"
import { useMe } from "@/features/session/hooks/use-me"

const chatKeys = {
  all: ["chat"] as const,
  rooms: (type?: RoomType) => [...chatKeys.all, "rooms", type ?? "all"] as const,
  room: (roomId: number) => [...chatKeys.all, "room", roomId] as const,
  messages: (roomId: number) => [...chatKeys.all, "messages", roomId] as const,
}

// 목록엔 실시간 WS 구독이 없어(방 요약 push용 사용자 단위 토픽 미구현) 폴링으로 갱신한다.
// BE에 /user/queue/rooms 토픽이 생기면 이 폴링을 구독으로 교체한다(FE 이슈 #126, BE 이슈 #103).
// 상세 설계: docs/superpowers/specs/2026-07-15-chat-list-realtime-design.md
const ROOMS_POLL_INTERVAL_MS = 5000

function useChatSessionAccess(requestedRoomId?: number) {
  const { data: me } = useMe()
  return resolveChatSessionAccess(me, requestedRoomId)
}

// 방 목록. 백엔드 summary엔 제목이 없어, 각 방 상세(members)를 병렬 조회해 제목/아바타를 파생한다.
function useChatRoomsView(type?: RoomType) {
  const session = useChatSessionAccess()
  const myUserId = session.userId ?? -1

  const roomsQuery = useQuery({
    queryKey: chatKeys.rooms(type),
    queryFn: () => getRooms(type),
    enabled: session.authenticated,
    // 요약(unreadCount·lastMessage·정렬)만 여기서 나오므로 이 쿼리만 폴링하면 된다.
    // 방 상세(제목/아바타)는 staleTime 60s 유지 → 폴링이 N+1 상세 재조회를 유발하지 않는다.
    refetchInterval: ROOMS_POLL_INTERVAL_MS,
    // 탭/앱 복귀 시 60s staleTime을 우회해 즉시 최신화(백그라운드에선 폴링 일시정지됨).
    refetchOnWindowFocus: "always",
  })

  const rooms = session.authenticated ? (roomsQuery.data ?? []) : []

  const detailQueries = useQueries({
    queries: rooms.map((room) => ({
      queryKey: chatKeys.room(room.roomId),
      queryFn: () => getRoom(room.roomId),
      staleTime: 60 * 1000,
    })),
  })

  // 연결 도메인 제목: group=모임 제목(meetingId), question=질문 제목(questionId).
  // 캐시 키를 meetup/question 피처와 공유해 중복 fetch를 피한다. direct는 비활성 자리표시자.
  const domainQueries = useQueries({
    queries: rooms.map((room) => {
      if (room.roomType === "group" && room.meetingId != null) {
        const meetingId = room.meetingId
        return {
          queryKey: meetupKeys.detail(meetingId),
          queryFn: () => getMeeting(meetingId),
          staleTime: 60 * 1000,
          meta: PUBLIC_QUERY_META,
        }
      }
      if (room.roomType === "question" && room.questionId != null) {
        const questionId = room.questionId
        return {
          queryKey: questionKeys.detail(questionId),
          queryFn: () => getQuestion(questionId),
          staleTime: 60 * 1000,
          meta: PUBLIC_QUERY_META,
        }
      }
      return {
        queryKey: [...chatKeys.room(room.roomId), "no-domain"],
        queryFn: () => Promise.resolve(null),
        enabled: false,
      }
    }),
  })

  const entries: ChatListEntry[] = rooms.map((room, index) => {
    const domainTitle =
      room.roomType === "direct"
        ? undefined
        : (domainQueries[index]?.data as { title?: string } | null | undefined)?.title
    return adaptRoomSummary(room, detailQueries[index]?.data, myUserId, domainTitle)
  })

  return {
    entries,
    isLoading: roomsQuery.isLoading,
    isError: roomsQuery.isError,
    refetch: roomsQuery.refetch,
  }
}

function useChatRoom(roomId: number, session: ChatSessionAccess) {
  const query = useQuery({
    queryKey: chatKeys.room(roomId),
    queryFn: () => getRoom(roomId),
    enabled: session.activeRoomId === roomId,
  })

  const room = session.activeRoomId === roomId ? query.data : undefined
  return { ...query, data: room }
}

// 최근 메시지 한 페이지(최대 50개). 서버는 최신순으로 내려주므로 화면 표시를 위해 오래된→최신으로 뒤집는다.
function useChatMessages(roomId: number, session: ChatSessionAccess) {
  const query = useQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: () => getMessages(roomId),
    enabled: session.activeRoomId === roomId,
  })

  const messages = session.activeRoomId === roomId && query.data
    ? [...query.data.items].reverse().map((message) => adaptMessage(message, session.userId ?? -1))
    : []

  return { messages, isLoading: query.isLoading, isError: query.isError }
}

export {
  chatKeys,
  useChatMessages,
  useChatRoom,
  useChatRoomsView,
  useChatSessionAccess,
}
