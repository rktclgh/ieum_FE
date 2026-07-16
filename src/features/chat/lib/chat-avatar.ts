type ChatRoomAvatarType = "direct" | "group" | "question"

interface ChatAvatarMember {
  userId: number
  avatarSrc?: string
}

function resolveChatRoomAvatar(
  roomType: ChatRoomAvatarType,
  members: readonly ChatAvatarMember[],
  myUserId: number,
  meetingAvatarSrc?: string,
  counterpart?: ChatAvatarMember | null
): string | undefined {
  if (roomType === "group") return meetingAvatarSrc
  const counterpartAvatar = counterpart && counterpart.userId !== myUserId ? counterpart.avatarSrc : undefined
  return counterpartAvatar ?? members.find((member) => member.userId !== myUserId)?.avatarSrc
}

export { resolveChatRoomAvatar }
