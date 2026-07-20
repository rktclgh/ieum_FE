"use client"

import { useQuery, type QueryClient } from "@tanstack/react-query"

import {
  getFriendRequests,
  getFriends,
  searchUsers,
} from "@/features/friends/api/friend-api"
import type {
  FriendRequestDirection,
  FriendResponse,
} from "@/features/friends/api/friend-types"
import {
  adaptFriend,
  adaptRequest,
  adaptSearchResult,
} from "@/features/friends/lib/friend-adapter"
import type { FriendPresence } from "@/features/friends/lib/friend-presence"

const friendKeys = {
  all: ["friends"] as const,
  list: () => [...friendKeys.all, "list"] as const,
  requests: (direction: FriendRequestDirection) =>
    [...friendKeys.all, "requests", direction] as const,
  search: (nickname: string) => [...friendKeys.all, "search", nickname] as const,
}

function useFriends() {
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: getFriends,
    select: (data) => data.map(adaptFriend),
  })
}

function useFriendRequests(direction: FriendRequestDirection) {
  return useQuery({
    queryKey: friendKeys.requests(direction),
    queryFn: () => getFriendRequests(direction),
    select: (data) => data.map(adaptRequest),
  })
}

function useUserSearch(nickname: string) {
  const query = nickname.trim()
  return useQuery({
    queryKey: friendKeys.search(query),
    queryFn: () => searchUsers(query),
    enabled: query.length > 0,
    select: (data) => data.map(adaptSearchResult),
  })
}

// SSE presence 이벤트를 친구 목록 캐시에 반영한다. 재조회 없이 해당 한 명만 갱신하므로
// 목록을 보고 있는 중에도 깜빡임이 없다. 목록을 아직 받지 않았다면 아무것도 하지 않는다.
function applyFriendPresence(queryClient: QueryClient, presence: FriendPresence) {
  queryClient.setQueryData<FriendResponse[]>(friendKeys.list(), (friends) => {
    if (!friends) return friends
    let changed = false
    const next = friends.map((friend) => {
      if (friend.userId !== presence.userId || friend.active === presence.online) return friend
      changed = true
      return { ...friend, active: presence.online }
    })
    // 참조를 유지해 관련 없는 이벤트에 리렌더가 나지 않게 한다.
    return changed ? next : friends
  })
}

export { applyFriendPresence, friendKeys, useFriends, useFriendRequests, useUserSearch }
