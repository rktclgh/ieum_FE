// 백엔드 친구/사용자 API 응답 타입. userId는 number, nationality는 ISO2("KR").
// 주의: 친구 목록/요청/차단 응답에는 nationality가 없다(검색·공개 프로필에만 존재).

type FriendRequestDirection = "received" | "sent"

interface FriendResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  lastActiveAt: string
  active: boolean
}

interface FriendRequestResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  requestedAt: string
}

interface BlockedUserResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  blockedAt: string
}

interface UserSearchResponse {
  userId: number
  nickname: string
  nationality: string
  profileImageUrl: string | null
  isFriend: boolean
  lastActiveAt: string
}

interface BlockedUserIdsResponse {
  userIds: number[]
}

export type {
  FriendRequestDirection,
  FriendResponse,
  FriendRequestResponse,
  BlockedUserResponse,
  UserSearchResponse,
  BlockedUserIdsResponse,
}
