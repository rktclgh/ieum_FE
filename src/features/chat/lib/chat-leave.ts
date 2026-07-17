import type { LeaveChatRoomTarget } from "@/features/chat/api/chat-types"

type LeaveChatRoomAction =
  | { kind: "chat-room"; roomId: number }
  | { kind: "meeting"; roomId: number; meetingId: number }

interface LeaveChatRoomTransport {
  leaveRoom: (roomId: number) => Promise<void>
  leaveMeeting: (meetingId: number) => Promise<void>
}

class GroupRoomMeetingLinkError extends Error {
  readonly code = "GROUP_ROOM_MEETING_LINK_MISSING"

  constructor(roomId: number) {
    super(`Group chat room ${roomId} is missing a valid meeting link.`)
    this.name = "GroupRoomMeetingLinkError"
  }
}

// group 채팅방은 백엔드가 의도적으로 거절하는 generic chat leave로 절대 폴백하지 않는다.
function resolveLeaveChatRoomAction(target: LeaveChatRoomTarget): LeaveChatRoomAction {
  if (target.roomType !== "group") {
    return { kind: "chat-room", roomId: target.roomId }
  }

  const meetingId = target.meetingId
  if (meetingId == null || !Number.isInteger(meetingId) || meetingId <= 0) {
    throw new GroupRoomMeetingLinkError(target.roomId)
  }

  return { kind: "meeting", roomId: target.roomId, meetingId }
}

async function executeLeaveChatRoom(
  target: LeaveChatRoomTarget,
  transport: LeaveChatRoomTransport
): Promise<void> {
  const action = resolveLeaveChatRoomAction(target)
  if (action.kind === "meeting") {
    await transport.leaveMeeting(action.meetingId)
    return
  }

  await transport.leaveRoom(action.roomId)
}

export {
  GroupRoomMeetingLinkError,
  executeLeaveChatRoom,
  resolveLeaveChatRoomAction,
}
export type { LeaveChatRoomAction, LeaveChatRoomTransport }
