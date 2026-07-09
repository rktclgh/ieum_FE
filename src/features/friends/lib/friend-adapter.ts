import { COUNTRIES, type CountryCode } from "@/lib/constants/countries"
import { resolveFileUrl } from "@/lib/api/file-url"
import { fromIso2 } from "@/features/join/lib/nationality-map"
import type {
  FriendRequestResponse,
  FriendResponse,
  UserSearchResponse,
} from "@/features/friends/api/friend-types"

// UI(FriendRequestItem)가 쓰는 공통 모델. 친구/요청 응답에는 국적이 없어 국기는 선택값이다.
interface FriendEntry {
  userId: number
  nickname: string
  avatarSrc?: string
  countryCode?: CountryCode
  flagSrc?: string
  active?: boolean
}

interface SearchEntry extends FriendEntry {
  isFriend: boolean
}

function flagOf(code: CountryCode | undefined) {
  if (!code) return undefined
  return COUNTRIES.find((country) => country.code === code)?.flag
}

function adaptFriend(friend: FriendResponse): FriendEntry {
  return {
    userId: friend.userId,
    nickname: friend.nickname,
    avatarSrc: resolveFileUrl(friend.profileImageUrl),
    active: friend.active,
  }
}

function adaptRequest(request: FriendRequestResponse): FriendEntry {
  return {
    userId: request.userId,
    nickname: request.nickname,
    avatarSrc: resolveFileUrl(request.profileImageUrl),
  }
}

function adaptSearchResult(user: UserSearchResponse): SearchEntry {
  const countryCode = fromIso2(user.nationality)
  return {
    userId: user.userId,
    nickname: user.nickname,
    avatarSrc: resolveFileUrl(user.profileImageUrl),
    countryCode,
    flagSrc: flagOf(countryCode),
    isFriend: user.isFriend,
  }
}

export { adaptFriend, adaptRequest, adaptSearchResult }
export type { FriendEntry, SearchEntry }
