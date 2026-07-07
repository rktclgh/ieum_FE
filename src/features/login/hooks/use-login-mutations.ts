import { useMutation, useQueryClient } from "@tanstack/react-query"

import { login } from "@/features/login/api/auth-api"

function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })
}

export { useLogin }
