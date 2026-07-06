import { useMutation } from "@tanstack/react-query"

import { login } from "@/features/login/api/auth-api"

function useLogin() {
  return useMutation({ mutationFn: login })
}

export { useLogin }
