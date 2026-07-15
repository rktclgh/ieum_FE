"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { AdminUserDetailPage } from "@/features/admin/users/components/admin-user-detail-page"
import { useTranslation } from "@/lib/i18n/use-translation"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function AdminUserDetailRoute() {
  const { messages } = useTranslation()
  const searchParams = useSearchParams()
  const userId = parsePositiveInteger(searchParams.get("userId"))

  if (userId === null) {
    return <AdminAsyncState kind="empty" message={messages.route.invalidLink} />
  }

  return <AdminUserDetailPage userId={userId} />
}

export default function AdminUserDetailRoutePage() {
  return (
    <React.Suspense fallback={<AdminAsyncState kind="loading" />}>
      <AdminUserDetailRoute />
    </React.Suspense>
  )
}
