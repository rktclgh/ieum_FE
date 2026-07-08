import { COUNTRIES } from "@/lib/constants/countries"
import type { CountryCode } from "@/lib/constants/countries"

function flagOf(code: CountryCode) {
  return COUNTRIES.find((country) => country.code === code)?.flag ?? ""
}

export const MOCK_STORY_FRIENDS = [
  { id: "1", name: "Mooon", online: true },
  { id: "2", name: "오이정", online: true },
  { id: "3", name: "김연두", online: false },
  { id: "4", name: "지지리", online: false },
  { id: "5", name: "Mason", online: false },
]

export const MOCK_CHATS: {
  id: string
  title: string
  category: "friend" | "meetup" | "question"
  memberCount?: number
  lastMessage?: string
  time?: string
  unreadCount?: number
  pinned?: boolean
  online?: boolean
  notice?: string
}[] = [
  {
    id: "c1",
    title: "7시에 용산에서 볼 사람",
    category: "meetup",
    memberCount: 5,
    lastMessage: "씨유 앞에서?",
    time: "12:11 PM",
    unreadCount: 9,
    pinned: true,
    online: true,
    notice: "7월 3일 오후 7시 용산역 1번 출구!!!",
  },
  {
    id: "c2",
    title: "오이정",
    category: "friend",
    lastMessage: "어디야",
    time: "12:19 PM",
    online: true,
  },
  {
    id: "c3",
    title: "김연두",
    category: "friend",
    online: false,
  },
  {
    id: "c4",
    title: "용산 독서 모임",
    category: "meetup",
    memberCount: 17,
    lastMessage: "그러시죠",
    time: "12:00 PM",
    online: true,
  },
  {
    id: "c5",
    title: "테니스 같이 치실 분!",
    category: "meetup",
    memberCount: 3,
    lastMessage: "넵",
    time: "3일 전",
    online: false,
  },
  {
    id: "c6",
    title: "이번 주 토요일에 한강공원에서 자전거 같이 타실 분 구합니다 (초보 환영)",
    category: "meetup",
    memberCount: 128,
    lastMessage: "네 좋습니다! 그럼 토요일 오전 10시에 뵐게요",
    time: "어제",
    online: true,
  },
]

export const MOCK_FRIEND_REQUESTS = [
  { id: "f1", name: "오이정", countryCode: "japan" as CountryCode, flagSrc: flagOf("japan") },
  { id: "f2", name: "wakawak", countryCode: "australia" as CountryCode, flagSrc: flagOf("australia") },
]

export const MOCK_MY_FRIENDS = [
  { id: "m1", name: "와레와레", countryCode: "japan" as CountryCode, flagSrc: flagOf("japan") },
  { id: "m2", name: "yoyo", countryCode: "australia" as CountryCode, flagSrc: flagOf("australia") },
]

export const MOCK_RECOMMENDED_FRIENDS = [
  { id: "r1", name: "와레와레", countryCode: "japan" as CountryCode, flagSrc: flagOf("japan") },
  { id: "r2", name: "yoyo", countryCode: "australia" as CountryCode, flagSrc: flagOf("australia"), requested: true },
]

export const MOCK_SEARCH_RESULTS = [
  { id: "s1", name: "와레와레", countryCode: "japan" as CountryCode, flagSrc: flagOf("japan"), requested: true },
  { id: "s2", name: "와레이", countryCode: "belgium" as CountryCode, flagSrc: flagOf("belgium") },
]

export const MOCK_MESSAGES: {
  id: string
  sender: "me" | "others"
  variant: "long" | "short" | "multiple" | "reply"
  name?: string
  texts?: string[]
  replyLabel?: string
  replyQuote?: string
  replyText?: string
  /** reply 전용: replyQuote가 인용하는 원본 메시지 id (클릭 시 해당 위치로 스크롤) */
  replyToId?: string
  /** reply 전용: 원본 메시지의 texts 중 실제로 인용된 문장의 index (여러 줄이 묶인 말풍선일 때 그중 한 줄만 강조하기 위함) */
  replyToIndex?: number
  time?: string
}[] = [
  {
    id: "msg1",
    sender: "others",
    variant: "long",
    name: "오이정",
    texts: ["이따 진짜 맛있는거 먹으러 가자. 나 배고파 죽겠음"],
    time: "오전 8:17",
  },
  { id: "msg2", sender: "me", variant: "short", texts: ["좋아요"], time: "오전 8:20" },
  {
    id: "msg3",
    sender: "others",
    variant: "multiple",
    name: "김연두",
    texts: ["맛있는거?", "떡볶이 먹을까?", "어떡할래"],
    time: "오전 8:21",
  },
  {
    id: "msg4",
    sender: "others",
    variant: "short",
    name: "wakawak",
    texts: ["떡볶이보다는 치킨이 땡기는 듯"],
    time: "오전 8:22",
  },
  { id: "msg5", sender: "me", variant: "short", texts: ["전 다 좋아요. 어디서 보죠"], time: "오전 8:22" },
  {
    id: "msg6",
    sender: "others",
    variant: "reply",
    replyLabel: "wakawak님이 김연두님에게 답장",
    replyQuote: "떡볶이 먹을까?",
    replyToId: "msg3",
    replyToIndex: 1,
    replyText: "떡볶이보다는 치킨이 땡기는 듯",
    time: "오전 8:23",
  },
  {
    id: "msg7",
    sender: "me",
    variant: "reply",
    replyLabel: "김연두님에게 답장",
    replyQuote: "떡볶이 먹을까?",
    replyToId: "msg3",
    replyToIndex: 1,
    replyText: "전 다 좋아요",
    time: "오전 8:24",
  },
]

export const MOCK_NOTICES: {
  id: string
  title: string
  authorName: string
  authorAvatarSrc?: string
  /** 리스트에 표시할 등록 시각 (예: "7월 7일 오후 8:22") */
  time: string
  /** 최신 등록 순 정렬 기준. 값이 클수록 최근에 등록됨 */
  registeredAt: number
  /** 채팅방 공지로 고정된 항목. 목록 최상단에 배치되며 동시에 한 개만 존재 */
  pinned?: boolean
}[] = [
  {
    id: "n1",
    title: "미가 양꼬치, 훠궈, 마라탕, 떡볶이, 순두부, 불고기, 포케, 짜장면, 완탕면, 쌀국수, 분짜",
    authorName: "오이정",
    time: "7월 7일 오후 8:22",
    registeredAt: 1,
  },
  {
    id: "n2",
    title: "누가 용산역에서 그렇게 걸어다니래!!!!",
    authorName: "오이정",
    time: "7월 7일 오후 8:22",
    registeredAt: 2,
  },
]

export const MOCK_MEMBERS = [
  { id: "u1", name: "김이음", isMe: true, countryCode: "south-korea" as CountryCode, flagSrc: flagOf("south-korea") },
  { id: "u2", name: "오이정", isOwner: true, countryCode: "japan" as CountryCode, flagSrc: flagOf("japan") },
  { id: "u3", name: "wakawak", countryCode: "australia" as CountryCode, flagSrc: flagOf("australia") },
  { id: "u4", name: "김연두", countryCode: "south-korea" as CountryCode, flagSrc: flagOf("south-korea") },
]
