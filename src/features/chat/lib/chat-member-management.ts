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
  nationalityCode?: ChatMemberEntry["nationalityCode"]
  canRemove: boolean
}

// 목록 정렬 우선순위: 나 > 방장 > 참여순(joinedAt 오름차순). rank가 낮을수록 상단.
function participantRank(participant: MeetingParticipant, currentUserId: number): number {
  if (participant.userId === currentUserId) return 0
  if (participant.isHost) return 1
  return 2
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
    .sort((left, right) => {
      const rankDiff =
        participantRank(left.participant, currentUserId) - participantRank(right.participant, currentUserId)
      if (rankDiff !== 0) return rankDiff

      const joinedAtDiff =
        new Date(left.participant.joinedAt).getTime() - new Date(right.participant.joinedAt).getTime()
      if (!Number.isNaN(joinedAtDiff) && joinedAtDiff !== 0) return joinedAtDiff

      return left.index - right.index
    })
    .map(({ participant }) => {
      const metadata = metadataByUserId.get(participant.userId)
      const isMe = participant.userId === currentUserId
      return {
        userId: participant.userId,
        name: participant.nickname,
        profileImageUrl: participant.profileImageUrl,
        isMe,
        isOwner: participant.isHost,
        nationalityCode: metadata?.nationalityCode,
        canRemove: currentUserIsHost && !isMe && !participant.isHost,
      }
    })
}

export { buildGroupChatMemberList }
export type { GroupChatMemberListInput, GroupChatMemberListItem }
