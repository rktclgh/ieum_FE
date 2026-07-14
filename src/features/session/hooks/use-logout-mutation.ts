import { useMutation, useQueryClient } from "@tanstack/react-query"

import { logout } from "@/features/session/api/session-api"
import { resetSessionCache } from "@/features/session/lib/session-cache"

function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await resetSessionCache(queryClient)
    },
  })
}

export { useLogoutMutation }
