import { useMutation, useQueryClient } from "@tanstack/react-query"

import { login } from "@/features/login/api/auth-api"
import { ME_QUERY_KEY } from "@/features/session/lib/session-cache"

function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY, exact: true })
    },
  })
}

export { useLogin }
