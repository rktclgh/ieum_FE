import { useQuery } from "@tanstack/react-query"
import axios from "axios"

import { refreshSession } from "@/features/session/api/session-api"
import { getCsrfTokenCookie } from "@/lib/api/client"

async function checkSession() {
  // csrf_token is only ever issued alongside a session, so its absence means
  // there's no session to refresh — skip the (CSRF-protected) network call entirely.
  if (!getCsrfTokenCookie()) return null

  try {
    return await refreshSession()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) return null
    throw error
  }
}

function useSessionCheck() {
  return useQuery({
    queryKey: ["session"],
    queryFn: checkSession,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export { useSessionCheck }
