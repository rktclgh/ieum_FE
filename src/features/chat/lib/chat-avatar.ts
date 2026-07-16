type ChatRoomAvatarType = "direct" | "group" | "question"

interface ChatAvatarMember {
  userId: number
  avatarSrc?: string
}

function resolveChatRoomAvatar(
  roomType: ChatRoomAvatarType,
  members: readonly ChatAvatarMember[],
  myUserId: number,
  meetingAvatarSrc?: string
): string | undefined {
  if (roomType === "group") return meetingAvatarSrc
  return members.find((member) => member.userId !== myUserId)?.avatarSrc
}

export { resolveChatRoomAvatar }
