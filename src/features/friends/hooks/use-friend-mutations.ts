"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  acceptFriendRequest,
  blockUser,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "@/features/friends/api/friend-api"
import type {
  FriendRequestResponse,
  FriendResponse,
} from "@/features/friends/api/friend-types"
import { friendKeys } from "@/features/friends/hooks/use-friends-queries"

// 상태 변경 성공 시 친구 관련 쿼리를 모두 무효화한다(거절·삭제·차단 등).
function useFriendMutation(mutationFn: (userId: number) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: friendKeys.all }),
  })
}

// 수락은 재조회가 즉시 반영되지 않아 "새로고침해야 보이는" 문제가 있었다(이슈 #125).
// 낙관적 업데이트로 즉시 반영한다: 받은 요청 캐시에서 제거 + 친구 목록 캐시에 삽입, 실패 시 롤백.
// (캐시엔 select 이전의 raw 응답 배열이 담긴다 → FriendRequestResponse[] / FriendResponse[]를 직접 다룬다.)
function useAcceptFriendRequest() {
  const queryClient = useQueryClient()
  const receivedKey = friendKeys.requests("received")
  const listKey = friendKeys.list()

  return useMutation({
    mutationFn: acceptFriendRequest,
    onMutate: async (userId: number) => {
      // 진행 중인 재조회가 낙관적 결과를 덮어쓰지 않도록 먼저 취소한다.
      await queryClient.cancelQueries({ queryKey: friendKeys.all })

      const prevReceived = queryClient.getQueryData<FriendRequestResponse[]>(receivedKey)
      const prevFriends = queryClient.getQueryData<FriendResponse[]>(listKey)

      const accepted = prevReceived?.find((request) => request.userId === userId)
      if (accepted) {
        // 받은 요청에서 제거
        queryClient.setQueryData<FriendRequestResponse[]>(receivedKey, (old) =>
          old?.filter((request) => request.userId !== userId) ?? old
        )
        // 친구 목록 맨 앞에 삽입(이미 있으면 유지). 요청 응답엔 active/lastActiveAt이 없어 채워 넣는다.
        queryClient.setQueryData<FriendResponse[]>(listKey, (old) => {
          if (!old) return old
          if (old.some((friend) => friend.userId === userId)) return old
          const optimisticFriend: FriendResponse = {
            userId: accepted.userId,
            nickname: accepted.nickname,
            profileImageUrl: accepted.profileImageUrl,
            lastActiveAt: accepted.requestedAt,
            active: true,
          }
          return [optimisticFriend, ...old]
        })
      }

      return { prevReceived, prevFriends }
    },
    onError: (_error, _userId, context) => {
      // 롤백: 스냅샷이 있으면 원복(실패 토스트는 컴포넌트의 mutate onError가 담당).
      if (context?.prevReceived !== undefined) {
        queryClient.setQueryData(receivedKey, context.prevReceived)
      }
      if (context?.prevFriends !== undefined) {
        queryClient.setQueryData(listKey, context.prevFriends)
      }
    },
    // 성공/실패 무관하게 서버 기준으로 정합성 재조회.
    onSettled: () => queryClient.invalidateQueries({ queryKey: friendKeys.all }),
  })
}

const useSendFriendRequest = () => useFriendMutation(sendFriendRequest)
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
