import type { WsRoomEvent } from "@/features/chat/api/chat-types"

function isActiveRoomRemoval(event: WsRoomEvent, activeRoomId: number | null): boolean {
  return event.type === "remove" && activeRoomId !== null && event.roomId === activeRoomId
}

export { isActiveRoomRemoval }
