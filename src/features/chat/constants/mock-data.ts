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

export const MOCK_CHATS = [
  {
    id: "c1",
    title: "7시에 용산에서 볼 사람",
    memberCount: 5,
    lastMessage: "씨유 앞에서?",
    time: "12:11 PM",
    unreadCount: 9,
    pinned: true,
    online: true,
  },
  {
    id: "c2",
    title: "오이정",
    lastMessage: "어디야",
    time: "12:19 PM",
    online: true,
  },
  {
    id: "c3",
    title: "김연두",
    online: false,
  },
  {
    id: "c4",
    title: "용산 독서 모임",
    memberCount: 17,
    lastMessage: "그러시죠",
    time: "12:00 PM",
    online: true,
  },
  {
    id: "c5",
    title: "테니스 같이 치실 분!",
    memberCount: 3,
    lastMessage: "넵",
    time: "3일 전",
    online: false,
  },
  {
    id: "c6",
    title: "이번 주 토요일에 한강공원에서 자전거 같이 타실 분 구합니다 (초보 환영)",
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
    replyText: "떡볶이보다는 치킨이 땡기는 듯",
    time: "오전 8:23",
  },
  {
    id: "msg7",
    sender: "me",
    variant: "reply",
    replyLabel: "김연두님에게 답장",
    replyQuote: "떡볶이 먹을까?",
    replyText: "전 다 좋아요",
    time: "오전 8:24",
  },
]

export const MOCK_MEMBERS = [
  { id: "u1", name: "김이음", isMe: true, countryCode: "south-korea" as CountryCode, flagSrc: flagOf("south-korea") },
  { id: "u2", name: "오이정", isOwner: true, countryCode: "japan" as CountryCode, flagSrc: flagOf("japan") },
  { id: "u3", name: "wakawak", countryCode: "australia" as CountryCode, flagSrc: flagOf("australia") },
  { id: "u4", name: "김연두", countryCode: "south-korea" as CountryCode, flagSrc: flagOf("south-korea") },
]
