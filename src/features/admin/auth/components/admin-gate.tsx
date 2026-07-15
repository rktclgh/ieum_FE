"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { resolveAdminGateDecision } from "@/features/admin/auth/lib/admin-access"
import type { AdminGatePolicy } from "@/features/admin/auth/lib/admin-access"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { LogoutButton } from "@/features/session/components/logout-button"
import { useAuthState } from "@/features/session/hooks/use-auth-state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function AdminGate({
  policy,
  children,
}: {
  policy: AdminGatePolicy
  children: React.ReactNode
}) {
  const router = useRouter()
  const { messages } = useTranslation()
  const { state, refetch } = useAuthState()
  const decision = resolveAdminGateDecision(policy, state)

  React.useEffect(() => {
    if (decision === "redirect-login") {
      router.replace(routes.adminLogin())
    } else if (decision === "redirect-home") {
      router.replace(routes.adminHome())
    }
  }, [decision, router])

  if (decision === "backend-down") {
    return <AdminAsyncState kind="error" onRetry={() => void refetch()} />
  }

  if (
    decision === "loading" ||
    decision === "redirect-login" ||
    decision === "redirect-home"
  ) {
    return <AdminAsyncState kind="loading" />
  }

  if (decision === "forbidden") {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-gray-50 px-6">
        <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p role="alert" className="text-title-semibold-18 text-gray-900">
            {messages.admin.auth.forbidden}
          </p>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.auth.switchAccount}
          </p>
          <LogoutButton />
        </section>
      </main>
    )
  }

  return children
}

export { AdminGate }
