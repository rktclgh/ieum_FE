"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  acceptFriendRequest,
  blockUser,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "@/features/friends/api/friend-api"
import { friendKeys } from "@/features/friends/hooks/use-friends-queries"

// 상태 변경 성공 시 친구 관련 쿼리를 모두 무효화한다(수락 시 requests·friends 동시 갱신 등).
function useFriendMutation(mutationFn: (userId: number) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: friendKeys.all }),
  })
}

const useSendFriendRequest = () => useFriendMutation(sendFriendRequest)
const useAcceptFriendRequest = () => useFriendMutation(acceptFriendRequest)
const useRemoveFriend = () => useFriendMutation(removeFriend)
const useBlockUser = () => useFriendMutation(blockUser)
const useUnblockUser = () => useFriendMutation(unblockUser)

export {
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriend,
  useBlockUser,
  useUnblockUser,
}
