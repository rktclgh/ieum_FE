import type { ChatMemberEntry } from "@/features/chat/lib/chat-adapter"
import type { MeetingParticipant } from "@/features/meetup/api/meetup-types"

interface GroupChatMemberListInput {
  currentUserId: number
  participants: MeetingParticipant[]
  roomMembers: ChatMemberEntry[]
}

interface GroupChatMemberListItem {
  userId: number
  name: string
  profileImageUrl: string | null
  isMe: boolean
  isOwner: boolean
  countryFlagSrc?: string
  nationalityCode?: ChatMemberEntry["nationalityCode"]
  canRemove: boolean
}

// 모임 참가자 API가 이름·프로필·참가 상태의 정본이다. chat room members는 국적 표시 보강에만 쓴다.
function buildGroupChatMemberList({
  currentUserId,
  participants,
  roomMembers,
}: GroupChatMemberListInput): GroupChatMemberListItem[] {
  const metadataByUserId = new Map(roomMembers.map((member) => [member.userId, member]))
  const currentUserIsHost = participants.some(
    (participant) => participant.userId === currentUserId && participant.isHost
  )

  return participants
    .map((participant, index) => ({ participant, index }))
    .sort(
      (left, right) =>
        Number(right.participant.isHost) - Number(left.participant.isHost) || left.index - right.index
    )
    .map(({ participant }) => {
      const metadata = metadataByUserId.get(participant.userId)
      const isMe = participant.userId === currentUserId
      return {
        userId: participant.userId,
        name: participant.nickname,
        profileImageUrl: participant.profileImageUrl,
        isMe,
        isOwner: participant.isHost,
        countryFlagSrc: metadata?.countryFlagSrc,
        nationalityCode: metadata?.nationalityCode,
        canRemove: currentUserIsHost && !isMe && !participant.isHost,
      }
    })
}

export { buildGroupChatMemberList }
export type { GroupChatMemberListInput, GroupChatMemberListItem }
