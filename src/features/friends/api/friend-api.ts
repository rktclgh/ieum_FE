import { apiClient } from "@/lib/api/client"

import type {
  BlockedUserIdsResponse,
  BlockedUserResponse,
  FriendRequestDirection,
  FriendRequestResponse,
  FriendResponse,
  UserSearchResponse,
} from "@/features/friends/api/friend-types"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getFriends() {
  const { data } = await apiClient.get<FriendResponse[]>("/api/v1/friends")
  return data
}

async function getFriendRequests(direction: FriendRequestDirection) {
  const { data } = await apiClient.get<FriendRequestResponse[]>("/api/v1/friends/requests", {
    params: { direction },
  })
  return data
}

async function getBlocks() {
  const { data } = await apiClient.get<BlockedUserResponse[]>("/api/v1/friends/blocks")
  return data
}

async function getBlockedUserIds() {
  const { data } = await apiClient.get<BlockedUserIdsResponse>("/api/v1/friends/blocked-user-ids")
  return data.userIds
}

async function searchUsers(nickname: string) {
  const { data } = await apiClient.get<UserSearchResponse[]>("/api/v1/users/search", {
    params: { nickname },
  })
  return data
}

// 상태 변경 (CSRF 필요, 모두 204 No Content)

async function sendFriendRequest(userId: number) {
  await apiClient.post(`/api/v1/friends/${userId}`)
}

async function acceptFriendRequest(userId: number) {
  await apiClient.post(`/api/v1/friends/${userId}/accept`)
}

// 관계 상태에 따라 친구 삭제 / 보낸 요청 취소 / 받은 요청 거절을 모두 처리한다.
async function removeFriend(userId: number) {
  await apiClient.delete(`/api/v1/friends/${userId}`)
}

async function blockUser(userId: number) {
  await apiClient.post(`/api/v1/friends/${userId}/block`)
}

async function unblockUser(userId: number) {
  await apiClient.delete(`/api/v1/friends/${userId}/block`)
}

export {
  getFriends,
  getFriendRequests,
  getBlocks,
  getBlockedUserIds,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
}
