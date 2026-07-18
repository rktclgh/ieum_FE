"use client"

import * as React from "react"

import { RequireAuthContext } from "@/features/session/components/require-auth-provider"

function useRequireAuth() {
  const requireAuth = React.useContext(RequireAuthContext)
  if (requireAuth === null) {
    throw new Error("useRequireAuth must be used within RequireAuthProvider")
  }
  return requireAuth
}

export { useRequireAuth }
