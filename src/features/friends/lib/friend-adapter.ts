import type { CountryCode } from "@/lib/constants/countries"
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
  active?: boolean
}

interface SearchEntry extends FriendEntry {
  isFriend: boolean
}

function adaptFriend(friend: FriendResponse): FriendEntry {
  return {
    userId: friend.userId,
    nickname: friend.nickname,
    avatarSrc: resolveFileUrl(friend.profileImageUrl),
    countryCode: fromIso2(friend.nationality),
    active: friend.active,
  }
}

function adaptRequest(request: FriendRequestResponse): FriendEntry {
  return {
    userId: request.userId,
    nickname: request.nickname,
    avatarSrc: resolveFileUrl(request.profileImageUrl),
    countryCode: fromIso2(request.nationality),
  }
}

function adaptSearchResult(user: UserSearchResponse): SearchEntry {
  return {
    userId: user.userId,
    nickname: user.nickname,
    avatarSrc: resolveFileUrl(user.profileImageUrl),
    countryCode: fromIso2(user.nationality),
    isFriend: user.isFriend,
  }
}

export { adaptFriend, adaptRequest, adaptSearchResult }
export type { FriendEntry, SearchEntry }
