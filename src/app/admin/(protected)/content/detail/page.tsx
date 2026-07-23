"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import {
  AdminContentDetailPage,
  parseAdminContentType,
} from "@/features/admin/content/components/admin-content-page"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function AdminContentDetailRoute() {
  const { messages } = useTranslation()
  const searchParams = useSearchParams()
  const contentType = parseAdminContentType(searchParams.get("type"))
  const contentId = parsePositiveInteger(searchParams.get("contentId"))

  if (contentType === null || contentId === null) {
    return <AdminAsyncState kind="empty" message={messages.route.invalidLink} />
  }

  return (
    <AdminContentDetailPage
      key={`${contentType}-${contentId}`}
      type={contentType}
      contentId={contentId}
    />
  )
}

export default function AdminContentDetailRoutePage() {
  return (
    <React.Suspense fallback={<AdminAsyncState kind="loading" />}>
      <AdminContentDetailRoute />
    </React.Suspense>
  )
}
