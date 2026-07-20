"use client"

import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { getMessages, getRoom, getRooms } from "@/features/chat/api/chat-api"
import type {
  ChatRoomSummaryResponse,
  RoomType,
  WsRoomEvent,
} from "@/features/chat/api/chat-types"
import {
  adaptMessage,
  adaptRoomSummary,
  type ChatListEntry,
  type ChatMessageView,
} from "@/features/chat/lib/chat-adapter"
import {
  resolveChatSessionAccess,
  type ChatSessionAccess,
} from "@/features/chat/lib/chat-session"
import { removeRoomFromAllLoadedListCaches } from "@/features/chat/lib/chat-room-event"
import { useChatRoomsSocket } from "@/features/chat/lib/chat-socket"
import { getMeeting } from "@/features/meetup/api/meetup-api"
import type { MeetingDetailResponse } from "@/features/meetup/api/meetup-types"
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

// 방 목록 요약 쿼리는 type별(chatKeys.rooms(type))로 나뉘어 캐시된다. 사용자 단위 토픽
// (/user/queue/rooms) 이벤트를 받으면 해당하는 모든 요약 캐시를 직접 갱신한다.
const roomsListKey = [...chatKeys.all, "rooms"] as const

// WS 델타는 이미 로드된 캐시만 패치한다. 아직 초기 fetch 중(data===undefined)인 쿼리에
// setQueryData로 [room]/[]를 채우면 로딩 상태를 건너뛰고 불완전한 목록이 잠깐 노출된다
// → getQueryData로 기존 데이터가 있는 캐시만 갱신하고, 없으면 진행 중/다음 fetch에 맡긴다.
// upsert: 필터(type)에 속하는 캐시에는 기존 항목 제거 후 최상단에 삽입(활동 있는 방을 위로),
// 속하지 않는 캐시에서는(방 유형 변경 등 예외) 제거만 한다.
function upsertRoomInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  room: ChatRoomSummaryResponse
) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: roomsListKey })) {
    const oldData = queryClient.getQueryData<ChatRoomSummaryResponse[]>(query.queryKey)
    if (oldData === undefined) continue

    const keyType = query.queryKey[2] as RoomType | "all" | undefined
    const belongs = keyType === "all" || keyType === room.roomType
    const without = oldData.filter((r) => r.roomId !== room.roomId)
    queryClient.setQueryData<ChatRoomSummaryResponse[]>(
      query.queryKey,
      belongs ? [room, ...without] : without
    )
  }
}

function useChatSessionAccess(requestedRoomId?: number) {
  const { data: me } = useMe()
  return resolveChatSessionAccess(me, requestedRoomId)
}

// 방 목록. 백엔드 summary엔 제목이 없어, 각 방 상세(members)를 병렬 조회해 제목/아바타를 파생한다.
function useChatRoomsView(type?: RoomType) {
  const session = useChatSessionAccess()
  const myUserId = session.userId ?? -1
  const queryClient = useQueryClient()

  const roomsQuery = useQuery({
    queryKey: chatKeys.rooms(type),
    queryFn: () => getRooms(type),
    enabled: session.authenticated,
    // 구독은 목록이 마운트된 동안만 유지된다. 방 상세·다른 탭으로 이동해 언마운트된 사이의
    // 이벤트는 놓치므로(WS 백필 없음), 다시 목록으로 돌아올 때 전역 staleTime 60s에 걸려
    // stale한 목록이 보일 수 있다. staleTime 0으로 재마운트/포커스마다 백그라운드 재요청해
    // 공백 기간을 메운다(캐시 데이터는 즉시 표시되므로 로딩 플래시 없음).
    staleTime: 0,
  })

  // 정식 실시간: 사용자 단위 토픽 구독 1개로 방 요약 변경을 받아 캐시를 직접 갱신한다(BE 이슈 #103).
  // 방 개수와 무관하게 구독 1개. 방 상세(제목/아바타)는 rooms 배열 변화에 반응해 useQueries가 파생한다.
  // 상세 설계: docs/superpowers/specs/2026-07-15-chat-list-realtime-design.md
  const onRoomEvent = useCallback(
    (event: WsRoomEvent) => {
      // remove는 명시적으로만 매칭한다. else로 받으면 서버가 보내는 알 수 없는 이벤트
      // (알림/고정 변경 알림 등)가 전부 삭제로 해석돼 방이 목록에서 사라졌다가,
      // mutation의 무효화 리페치로 다시 나타나는 깜빡임이 생긴다.
      if (event.type === "upsert") {
        upsertRoomInCaches(queryClient, event.room)
      } else if (event.type === "remove") {
        removeRoomFromAllLoadedListCaches(queryClient, roomsListKey, event.roomId)
      }
    },
    [queryClient]
  )
  useChatRoomsSocket(session.authenticated, { onRoomEvent })

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
    const domainData = domainQueries[index]?.data
    const domainTitle =
      room.roomType === "direct"
        ? undefined
        : (domainData as { title?: string } | null | undefined)?.title
    const meetingImageUrl =
      room.roomType === "group"
        ? (domainData as MeetingDetailResponse | undefined)?.imageUrl
        : undefined
    return adaptRoomSummary(
      room,
      detailQueries[index]?.data,
      myUserId,
      domainTitle,
      meetingImageUrl
    )
  })

  return {
    entries,
    isLoading: roomsQuery.isLoading,
    isError: roomsQuery.isError,
    refetch: roomsQuery.refetch,
  }
}

// 현재 고정된 방의 id. 고정은 전체에서 1개만 허용되므로 첫 번째 항목만 본다.
// useChatRoomsView와 달리 방별 상세/도메인 쿼리를 띄우지 않는 가벼운 훅으로, 목록 요약
// 캐시(chatKeys.rooms())를 목록 화면과 공유한다 → 목록에서 쓸 때 추가 요청이 없다.
//
// 목록이 아직 도착하지 않았을 때도 pinnedRoomId는 undefined다("고정된 방 없음"과 구분되지
// 않는다). 방 상세처럼 이 쿼리와 무관하게 렌더되는 화면에서 그대로 쓰면 교체 확인을 건너뛰고
// 중복 고정될 수 있으므로 isLoading을 함께 돌려주고, 호출부가 로딩 중 고정을 막는다.
function usePinnedRoomId() {
  const session = useChatSessionAccess()
  const query = useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: () => getRooms(),
    enabled: session.authenticated,
    staleTime: 0,
  })

  return {
    pinnedRoomId: query.data?.find((room) => room.pinned)?.roomId,
    isLoading: query.isLoading,
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

// 한 번에 불러올 메시지 페이지 크기. 서버는 최신순 items + nextCursor(더 과거 페이지 커서)를 내려준다.
const MESSAGES_PAGE_SIZE = 30

// 커서 페이지네이션. pages[0]=최신 페이지, 뒤 페이지일수록 과거. 화면 표시는 오래된→최신이므로
// 페이지를 역순으로, 각 페이지의 items(최신순)도 역순으로 평탄화한다.
// messages 배열은 useMemo로 memoize해 리렌더마다 새 참조가 생기지 않게 한다(스크롤 스냅백 방지).
function useChatMessages(roomId: number, session: ChatSessionAccess) {
  const enabled = session.activeRoomId === roomId
  const query = useInfiniteQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: ({ pageParam }) => getMessages(roomId, pageParam, MESSAGES_PAGE_SIZE),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const userId = session.userId ?? -1
  const messages: ChatMessageView[] = useMemo(() => {
    if (!enabled || !query.data) return []
    return query.data.pages
      .slice()
      .reverse()
      .flatMap((page) => [...page.items].reverse().map((message) => adaptMessage(message, userId)))
  }, [enabled, query.data, userId])

  return {
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}

export {
  chatKeys,
  useChatMessages,
  useChatRoom,
  useChatRoomsView,
  useChatSessionAccess,
  usePinnedRoomId,
}
