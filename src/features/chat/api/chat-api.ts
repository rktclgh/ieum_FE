import { apiClient } from "@/lib/api/client"

import type {
  ChatCursorPage,
  ChatMessageResponse,
  ChatRoomDetailResponse,
  ChatRoomResponse,
  ChatRoomSummaryResponse,
  QuestionRoomRequest,
  RoomType,
} from "@/features/chat/api/chat-types"

// 조회 (CSRF 불필요) — apiClient가 withCredentials/CSRF/401 refresh를 자동 처리한다.

async function getRooms(type?: RoomType) {
  const { data } = await apiClient.get<ChatRoomSummaryResponse[]>("/api/v1/chat/rooms", {
    params: type ? { type } : undefined,
  })
  return data
}

async function getRoom(roomId: number) {
  const { data } = await apiClient.get<ChatRoomDetailResponse>(`/api/v1/chat/rooms/${roomId}`)
  return data
}

async function getMessages(roomId: number, cursor?: string, size?: number) {
  const { data } = await apiClient.get<ChatCursorPage<ChatMessageResponse>>(
    `/api/v1/chat/rooms/${roomId}/messages`,
    { params: { cursor, size } }
  )
  return data
}

// 상태 변경 (CSRF 필요)

async function createDirectRoom(friendId: number) {
  const { data } = await apiClient.post<ChatRoomResponse>("/api/v1/chat/rooms/direct", { friendId })
  return data
}

// 답변자와의 꼬리질문 1:1 방 생성/조회(멱등). BE 이슈 #68 계약. (CSRF 필요)
async function createQuestionRoom(body: QuestionRoomRequest) {
  const { data } = await apiClient.post<ChatRoomResponse>("/api/v1/chat/rooms/question", body)
  return data
}

async function markRead(roomId: number) {
  await apiClient.post(`/api/v1/chat/rooms/${roomId}/read`)
}

async function setPinned(roomId: number, pinned: boolean) {
  await apiClient.put(`/api/v1/chat/rooms/${roomId}/pin`, { pinned })
}

async function setNotify(roomId: number, enabled: boolean) {
  await apiClient.put(`/api/v1/chat/rooms/${roomId}/notify`, { enabled })
}

async function leaveRoom(roomId: number) {
  await apiClient.post(`/api/v1/chat/rooms/${roomId}/leave`)
}

async function disbandRoom(roomId: number) {
  await apiClient.delete(`/api/v1/chat/rooms/${roomId}`)
}

export {
  getRooms,
  getRoom,
  getMessages,
  createDirectRoom,
  createQuestionRoom,
  markRead,
  setPinned,
  setNotify,
  leaveRoom,
  disbandRoom,
}
