"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"

import {
  AdminKnowledgeCandidateDetailPage,
  AdminKnowledgeCandidatesList,
} from "@/features/admin/knowledge/components/admin-knowledge-candidates-page"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { useTranslation } from "@/lib/i18n/use-translation"
import { parsePositiveInteger } from "@/lib/navigation/routes"

function AdminKnowledgeRoute() {
  const { messages } = useTranslation()
  const searchParams = useSearchParams()
  const candidateIdValue = searchParams.get("candidateId")
  const candidateId = parsePositiveInteger(candidateIdValue)

  if (candidateIdValue !== null && candidateId === null) {
    return <AdminAsyncState kind="empty" message={messages.route.invalidLink} />
  }

  if (candidateId !== null) {
    return (
      <AdminKnowledgeCandidateDetailPage
        key={candidateId}
        candidateId={candidateId}
      />
    )
  }

  return <AdminKnowledgeCandidatesList />
}

export default function AdminKnowledgeRoutePage() {
  return (
    <React.Suspense fallback={<AdminAsyncState kind="loading" />}>
      <AdminKnowledgeRoute />
    </React.Suspense>
  )
}
