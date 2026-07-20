type ChatRoomAvatarType = "direct" | "group" | "question"

interface ChatAvatarMember {
  userId: number
  avatarSrc?: string
}

interface ChatRoomAvatars {
  avatarSrc?: string
  // 3명 이상 방에서 겹쳐 그릴 두 번째 프로필. 값이 없어도(멤버 사진 미설정) grouped는 유지된다.
  secondaryAvatarSrc?: string
  // 두 프로필을 겹쳐 표시할지 여부(나 제외 참여자 2명 이상). Figma "ChatProfile/L" 대응.
  grouped: boolean
}

// 방 아바타 해석 규칙:
// - 나 제외 참여자 ≥ 2명(총 3명 이상): 앞 2명의 프로필을 겹쳐 표시(grouped).
//   겹칠 2명은 제목 파생(others.slice(0,2))과 같은 순서라 제목과 일관된다.
// - direct: 상대 1명 프로필. group(멤버 미로딩 등): 모임 이미지로 폴백.
function resolveChatRoomAvatars(
  roomType: ChatRoomAvatarType,
  members: readonly ChatAvatarMember[],
  myUserId: number,
  meetingAvatarSrc?: string,
  counterpart?: ChatAvatarMember | null
): ChatRoomAvatars {
  const others = members.filter((member) => member.userId !== myUserId)
  if (others.length >= 2) {
    return { avatarSrc: others[0].avatarSrc, secondaryAvatarSrc: others[1].avatarSrc, grouped: true }
  }
  if (roomType === "group") return { avatarSrc: meetingAvatarSrc, grouped: false }
  const counterpartAvatar = counterpart && counterpart.userId !== myUserId ? counterpart.avatarSrc : undefined
  return { avatarSrc: counterpartAvatar ?? others[0]?.avatarSrc, grouped: false }
}

export { resolveChatRoomAvatars }
export type { ChatRoomAvatars }
