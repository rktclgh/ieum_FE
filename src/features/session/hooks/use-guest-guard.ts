"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { useSessionCheck } from "@/features/session/hooks/use-session-check"

function useGuestGuard(redirectTo = "/") {
  const router = useRouter()
  const { data, isPending } = useSessionCheck()
  const isLoggedIn = Boolean(data)

  React.useEffect(() => {
    if (isLoggedIn) router.replace(redirectTo)
  }, [isLoggedIn, redirectTo, router])

  return { isChecking: isPending || isLoggedIn }
}

export { useGuestGuard }
