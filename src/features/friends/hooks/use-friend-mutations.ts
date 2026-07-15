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

// 겹치는 수락(빠르게 여러 요청 수락)에서도 안전하도록 유저 단위로만 낙관 처리/롤백한다.
const ACCEPT_MUTATION_KEY = [...friendKeys.all, "accept"] as const

// 수락은 재조회가 즉시 반영되지 않아 "새로고침해야 보이는" 문제가 있었다(이슈 #125).
// 낙관적 업데이트로 즉시 반영한다: 받은 요청 캐시에서 해당 유저 제거 + 친구 목록에 삽입, 실패 시 해당 유저만 롤백.
// (캐시엔 select 이전의 raw 응답 배열이 담긴다 → FriendRequestResponse[] / FriendResponse[]를 직접 다룬다.)
// 전체 배열 스냅샷 복원은 겹치는 수락 시 다른 요청의 낙관 상태를 덮어쓰므로 쓰지 않는다.
function useAcceptFriendRequest() {
  const queryClient = useQueryClient()
  const receivedKey = friendKeys.requests("received")
  const listKey = friendKeys.list()

  return useMutation({
    mutationKey: ACCEPT_MUTATION_KEY,
    mutationFn: acceptFriendRequest,
    onMutate: async (userId: number) => {
      // 진행 중인 재조회가 낙관적 결과를 덮어쓰지 않도록 먼저 취소한다.
      await queryClient.cancelQueries({ queryKey: friendKeys.all })

      const received = queryClient.getQueryData<FriendRequestResponse[]>(receivedKey)
      const accepted = received?.find((request) => request.userId === userId)
      // 롤백에 필요한 최소 정보만 스냅샷: 이 유저가 원래 받은요청에 있었는지 + 그 엔트리.
      if (!accepted) return { accepted: null }

      // 받은 요청에서 이 유저만 제거
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
          nationality: accepted.nationality,
          lastActiveAt: accepted.requestedAt,
          active: true,
        }
        return [optimisticFriend, ...old]
      })

      return { accepted }
    },
    onError: (_error, userId, context) => {
      // 유저 단위 롤백: 이 유저만 되돌린다(다른 진행 중 수락의 낙관 상태는 건드리지 않음).
      // 실패 토스트는 컴포넌트의 mutate onError가 담당.
      const accepted = context?.accepted
      if (!accepted) return
      queryClient.setQueryData<FriendResponse[]>(listKey, (old) =>
        old?.filter((friend) => friend.userId !== userId) ?? old
      )
      queryClient.setQueryData<FriendRequestResponse[]>(receivedKey, (old) => {
        if (!old) return old
        if (old.some((request) => request.userId === userId)) return old
        return [...old, accepted]
      })
    },
    // 정합성 재조회는 겹치는 수락의 "마지막" 것이 끝날 때만 실행한다.
    // (isMutating이 1이면 지금 settle 중인 이 뮤테이션만 남은 것 → 재조회가 다른 낙관 상태를 덮어쓰지 않음.)
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ACCEPT_MUTATION_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: friendKeys.all })
      }
    },
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
