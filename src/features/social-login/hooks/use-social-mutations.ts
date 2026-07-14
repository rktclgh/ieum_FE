"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ME_QUERY_KEY } from "@/features/session/lib/session-cache"
import {
  completeSocialSignup,
  startSocial,
} from "@/features/social-login/api/social-api"

function useStartSocial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startSocial,
    onSuccess: async (response) => {
      if (!response.isNewUser) {
        await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY, exact: true })
      }
    },
  })
}

function useCompleteSocialSignup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeSocialSignup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY, exact: true })
    },
  })
}

export { useCompleteSocialSignup, useStartSocial }
