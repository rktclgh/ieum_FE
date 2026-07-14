import { useQuery } from "@tanstack/react-query"

import { getMe } from "@/features/session/api/session-api"
import { ME_QUERY_KEY } from "@/features/session/lib/session-cache"

// users/me를 인증 상태의 단일 진실 공급원으로 삼는다:
// isPending → 아직 모름, data 있음 → 로그인됨, data null → 로그인 안 됨
function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export { useMe }
