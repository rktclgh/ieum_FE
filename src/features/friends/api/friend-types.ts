// 백엔드 친구/사용자 API 응답 타입. userId는 number, nationality는 ISO2("KR").
// 친구/요청 응답에도 nationality가 포함된다(BE #97). 차단 응답에는 없다.

type FriendRequestDirection = "received" | "sent"

interface FriendResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  nationality: string
  lastActiveAt: string
  active: boolean
}

interface FriendRequestResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  nationality: string
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
