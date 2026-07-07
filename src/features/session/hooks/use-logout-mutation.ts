import { useMutation, useQueryClient } from "@tanstack/react-query"

import { logout } from "@/features/session/api/session-api"

function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["me"], null)
    },
  })
}

export { useLogoutMutation }
