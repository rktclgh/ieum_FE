"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  submitInquiry,
  updateLocation,
  updateMe,
  updateSettings,
  withdrawMe,
} from "@/features/my/api/my-api"
import type { UserMeResponse, UserSettings } from "@/features/session/api/session-api"
import {
  createSessionMutationCallbacks,
  ME_QUERY_KEY,
  resetSessionCache,
} from "@/features/session/lib/session-cache"

// PATCH /users/me 는 전체 UserMeResponse 를 authoritative 로 되돌려주므로,
// 재요청(invalidate) 대신 ME_QUERY_KEY 캐시를 바로 갱신해 화면 깜빡임을 없앤다.
function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateMe,
    ...createSessionMutationCallbacks(queryClient, (data: UserMeResponse) => {
      queryClient.setQueryData<UserMeResponse>(ME_QUERY_KEY, data)
    }),
  })
}

// PATCH /users/me/settings 는 settings 부분만 되돌려주므로, 캐시의 me 안에 병합한다.
function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSettings,
    ...createSessionMutationCallbacks(queryClient, (settings: UserSettings) => {
      queryClient.setQueryData<UserMeResponse>(ME_QUERY_KEY, (previous) =>
        previous ? { ...previous, settings } : previous
      )
    }),
  })
}

// PUT /users/me/location 은 204라 캐시에 반영할 본문이 없다(위치는 me 응답에 포함되지 않음).
function useUpdateLocation() {
  return useMutation({ mutationFn: updateLocation })
}

// DELETE /users/me — 로그아웃과 동일하게 성공 시 세션 캐시를 전부 리셋한다(쿠키는 BE가 만료).
function useWithdrawMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: withdrawMe,
    onSuccess: async () => {
      await resetSessionCache(queryClient)
    },
  })
}

// POST /inquiries — 204/2xx, 캐시에 반영할 상태 없음.
function useSubmitInquiry() {
  return useMutation({ mutationFn: submitInquiry })
}

export {
  useUpdateMe,
  useUpdateSettings,
  useUpdateLocation,
  useWithdrawMe,
  useSubmitInquiry,
}
