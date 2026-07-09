"use client"

import { useQuery } from "@tanstack/react-query"

import {
  getFriendRequests,
  getFriends,
  searchUsers,
} from "@/features/friends/api/friend-api"
import type { FriendRequestDirection } from "@/features/friends/api/friend-types"
import {
  adaptFriend,
  adaptRequest,
  adaptSearchResult,
} from "@/features/friends/lib/friend-adapter"

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

export { friendKeys, useFriends, useFriendRequests, useUserSearch }
