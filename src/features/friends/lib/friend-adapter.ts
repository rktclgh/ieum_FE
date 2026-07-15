import { COUNTRIES, type CountryCode } from "@/lib/constants/countries"
import { resolveFileUrl } from "@/lib/api/file-url"
import { fromIso2 } from "@/features/join/lib/nationality-map"
import type {
  FriendRequestResponse,
  FriendResponse,
  UserSearchResponse,
} from "@/features/friends/api/friend-types"

// UI(FriendRequestItem)가 쓰는 공통 모델. 매칭 실패 시 국기는 생략되므로 선택값이다.
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
  const countryCode = fromIso2(friend.nationality)
  return {
    userId: friend.userId,
    nickname: friend.nickname,
    avatarSrc: resolveFileUrl(friend.profileImageUrl),
    countryCode,
    flagSrc: flagOf(countryCode),
    active: friend.active,
  }
}

function adaptRequest(request: FriendRequestResponse): FriendEntry {
  const countryCode = fromIso2(request.nationality)
  return {
    userId: request.userId,
    nickname: request.nickname,
    avatarSrc: resolveFileUrl(request.profileImageUrl),
    countryCode,
    flagSrc: flagOf(countryCode),
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
