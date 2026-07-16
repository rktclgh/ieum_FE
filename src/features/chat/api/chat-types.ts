// 백엔드 채팅 API 응답 타입. roomId/senderId는 number, 시각은 ISO(OffsetDateTime) 문자열.
// 주의: 방 목록/상세 응답에는 방 제목이 없다 → 제목은 members(다이렉트=상대 닉네임)로 FE에서 파생한다.

type RoomType = "direct" | "group" | "question"

interface ChatMessageResponse {
  messageId: number
  roomId: number
  senderId: number
  senderNickname: string
  senderProfileImageUrl: string | null
  content: string | null
  imageUrl: string | null
  createdAt: string
}

interface ChatRoomSummaryResponse {
  roomId: number
  roomType: RoomType
  meetingId: number | null
  questionId: number | null
  pinned: boolean
  notifyEnabled: boolean
  unreadCount: number
  lastMessage: ChatMessageResponse | null
}

interface ChatRoomMemberResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  // 국적(ISO 3166-1 alpha-2). BE 이슈 #70 전까지 없을 수 있음.
  nationality?: string | null
}

interface ChatRoomDetailResponse {
  roomId: number
  roomType: RoomType
  meetingId: number | null
  questionId: number | null
  pinned: boolean
  notifyEnabled: boolean
  members: ChatRoomMemberResponse[]
  // direct/question의 대화 상대. 상대가 나가도 남아 있는 사용자의 대표 이미지용으로 유지된다.
  // 점진 배포 중 이전 백엔드 응답과도 호환되도록 optional이다.
  counterpart?: ChatRoomMemberResponse | null
}

interface ChatCursorPage<T> {
  items: T[]
  nextCursor: string | null
}

interface ChatRoomResponse {
  roomId: number
  roomType: RoomType
  meetingId: number | null
  questionId: number | null
}

// WebSocket /topic/rooms/{roomId} 로 브로드캐스트되는 이벤트. ChatMessageResponse와 필드가 동일하다.
interface WsMessageEvent {
  messageId: number
  roomId: number
  senderId: number
  senderNickname: string
  senderProfileImageUrl: string | null
  content: string | null
  imageUrl: string | null
  createdAt: string
}

// WebSocket /user/queue/rooms 로 내려오는 사용자 단위 방 요약 이벤트 (BE 이슈 #103).
// upsert: 방 요약이 바뀌거나 새 방에 추가됨(room은 ChatRoomSummaryResponse와 동일 스키마).
// remove: 방을 나가거나 해체돼 내 목록에서 제거됨.
type WsRoomEvent =
  | { type: "upsert"; room: ChatRoomSummaryResponse }
  | { type: "remove"; roomId: number }

interface SendChatMessageRequest {
  content?: string
  imageFileId?: string
}

// 답변 보기 → 답변자와의 꼬리질문 1:1 방 생성 요청 (BE 이슈 #68).
interface QuestionRoomRequest {
  questionId: number
  targetUserId: number
}

// /user/queue/errors 로 내려오는 WebSocket 에러
interface ChatWebSocketErrorResponse {
  code: string
  message: string
  detail: string | null
}

export type {
  RoomType,
  ChatMessageResponse,
  ChatRoomSummaryResponse,
  ChatRoomMemberResponse,
  ChatRoomDetailResponse,
  ChatCursorPage,
  ChatRoomResponse,
  WsMessageEvent,
  WsRoomEvent,
  SendChatMessageRequest,
  ChatWebSocketErrorResponse,
  QuestionRoomRequest,
}
