import type { WsMessageEvent } from "@/features/chat/api/chat-types"

type RoomMessageChannel = "user" | "system"

function roomMessageDestination(roomId: number, channel: RoomMessageChannel): string {
  return channel === "user" ? `/user/queue/rooms/${roomId}` : `/topic/rooms/${roomId}`
}

function acceptsRoomMessageForChannel(
  event: Pick<WsMessageEvent, "messageType">,
  channel: RoomMessageChannel
): boolean {
  return (event.messageType ?? "user") === channel
}

export { acceptsRoomMessageForChannel, roomMessageDestination }
export type { RoomMessageChannel }
