"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import {
  SessionLoading,
  SessionUnavailable,
} from "@/features/session/components/session-route-state"
import { useAuthState } from "@/features/session/hooks/use-auth-state"
import { routes } from "@/lib/navigation/routes"

type AuthGatePolicy = "protected" | "guest-only"

function AuthGate({
  policy,
  children,
}: {
  policy: AuthGatePolicy
  children: React.ReactNode
}) {
  const router = useRouter()
  const { state, refetch } = useAuthState()

  const shouldRedirectToLogin = policy === "protected" && state.kind === "guest"
  const shouldRedirectHome = policy === "guest-only" && state.kind === "authenticated"

  React.useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(routes.login())
    } else if (shouldRedirectHome) {
      router.replace(routes.home())
    }
  }, [router, shouldRedirectHome, shouldRedirectToLogin])

  if (state.kind === "backend-down") {
    return <SessionUnavailable onRetry={() => void refetch()} />
  }

  if (state.kind === "loading" || shouldRedirectToLogin || shouldRedirectHome) {
    return <SessionLoading />
  }

  return children
}

export { AuthGate }
export type { AuthGatePolicy }
