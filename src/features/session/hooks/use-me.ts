import { useQuery } from "@tanstack/react-query"
import * as React from "react"

import { getMe } from "@/features/session/api/session-api"
import { getCsrfTokenCookie } from "@/lib/api/client"

interface UseMeOptions {
  requireSessionHint?: boolean
}

// users/me를 인증 상태의 단일 진실 공급원으로 삼는다:
// isPending → 아직 모름, data 있음 → 로그인됨, isError(401) → 로그인 안 됨
function useMe({ requireSessionHint = false }: UseMeOptions = {}) {
  const [hasCheckedSessionHint, setHasCheckedSessionHint] = React.useState(false)
  const [hasSessionHint, setHasSessionHint] = React.useState(false)

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasSessionHint(Boolean(getCsrfTokenCookie()))
      setHasCheckedSessionHint(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !requireSessionHint || (hasCheckedSessionHint && hasSessionHint),
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export { useMe }
