"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { updateLocation, updateMe, updateSettings } from "@/features/my/api/my-api"
import type { UserMeResponse, UserSettings } from "@/features/session/api/session-api"
import {
  createSessionMutationCallbacks,
  ME_QUERY_KEY,
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

export { useUpdateMe, useUpdateSettings, useUpdateLocation }
