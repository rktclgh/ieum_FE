"use client"

import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import {
  KNOWLEDGE_RELATION_PREDICATES,
} from "@/features/admin/knowledge/api/admin-knowledge-candidates-api"
import type {
  AdminKnowledgeCandidateItem,
  KnowledgeCandidateStatus,
  KnowledgeRelationPredicate,
} from "@/features/admin/knowledge/api/admin-knowledge-candidates-api"
import {
  useAdminKnowledgeCandidateDetail,
  useAdminKnowledgeCandidates,
  useApproveAdminKnowledgeCandidate,
  useRejectAdminKnowledgeCandidate,
} from "@/features/admin/knowledge/hooks/use-admin-knowledge-candidates"
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function formatDateTime(value: string | null, formatter: Intl.DateTimeFormat) {
  return value === null ? "—" : formatter.format(new Date(value))
}

function getApiErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined
  }

  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === "number" ? response.status : undefined
}

function isKnowledgeCandidateConflict(error: unknown) {
  return (
    getApiErrorCode(error) === "KNOWLEDGE_CANDIDATE_CONFLICT" ||
    getApiErrorStatus(error) === 409
  )
}

function normalizeDraft(value: string) {
  const normalized = value.trim()
  return normalized.length === 0 ? null : normalized
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded-xl bg-gray-50 p-4">
      <dt className="text-body-medium-14 text-gray-600">{label}</dt>
      <dd className="break-words text-body-regular-14 text-gray-900">{value}</dd>
    </div>
  )
}

type KnowledgeCandidateAction = "approve" | "reject"

interface AdminKnowledgeCandidateDecisionFormProps {
  candidate: AdminKnowledgeCandidateItem
  refreshBusy: boolean
  activeMutationAction: KnowledgeCandidateAction | null
  onApprove: (input: {
    subject: string
    predicate: KnowledgeRelationPredicate
    object: string
  }) => void
  onReject: (reason: string | null) => void
}

function AdminKnowledgeCandidateDecisionForm({
  candidate,
  refreshBusy,
  activeMutationAction,
  onApprove,
  onReject,
}: AdminKnowledgeCandidateDecisionFormProps) {
  const { messages } = useTranslation()
  const [subject, setSubject] = React.useState(candidate.subject)
  const [predicate, setPredicate] =
    React.useState<KnowledgeRelationPredicate>(candidate.predicate)
  const [object, setObject] = React.useState(candidate.object)
  const [rejectReason, setRejectReason] = React.useState("")
  const normalizedSubject = normalizeDraft(subject)
  const normalizedObject = normalizeDraft(object)
  const approveDisabled =
    refreshBusy ||
    activeMutationAction === "approve" ||
    normalizedSubject === null ||
    normalizedObject === null
  const rejectDisabled = refreshBusy || activeMutationAction === "reject"

  return (
    <>
      <section aria-labelledby="admin-knowledge-relation-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-knowledge-relation-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.knowledge.relation}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <label
            htmlFor="admin-knowledge-subject"
            className="space-y-2 text-body-medium-14 text-gray-700"
          >
            <span className="block">{messages.admin.knowledge.subject}</span>
            <input
              id="admin-knowledge-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={refreshBusy}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </label>
          <label
            htmlFor="admin-knowledge-predicate"
            className="space-y-2 text-body-medium-14 text-gray-700"
          >
            <span className="block">{messages.admin.knowledge.predicate}</span>
            <select
              id="admin-knowledge-predicate"
              value={predicate}
              onChange={(event) =>
                setPredicate(event.target.value as KnowledgeRelationPredicate)
              }
              disabled={refreshBusy}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              {KNOWLEDGE_RELATION_PREDICATES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label
            htmlFor="admin-knowledge-object"
            className="space-y-2 text-body-medium-14 text-gray-700"
          >
            <span className="block">{messages.admin.knowledge.object}</span>
            <input
              id="admin-knowledge-object"
              value={object}
              onChange={(event) => setObject(event.target.value)}
              disabled={refreshBusy}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </label>
        </div>
      </section>

      <section aria-labelledby="admin-knowledge-action-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-knowledge-action-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.knowledge.review}
        </h2>
        <label
          htmlFor="admin-knowledge-reject-reason"
          className="block space-y-2 text-body-medium-14 text-gray-700"
        >
          <span className="block">{messages.admin.knowledge.rejectReason}</span>
          <textarea
            id="admin-knowledge-reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            maxLength={500}
            disabled={refreshBusy}
            className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (normalizedSubject === null || normalizedObject === null) return
              onApprove({
                subject: normalizedSubject,
                predicate,
                object: normalizedObject,
              })
            }}
            disabled={approveDisabled}
            aria-busy={activeMutationAction === "approve" || undefined}
          >
            {messages.admin.knowledge.approve}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onReject(normalizeDraft(rejectReason))}
            disabled={rejectDisabled}
            aria-busy={activeMutationAction === "reject" || undefined}
          >
            {messages.admin.knowledge.reject}
          </Button>
        </div>
      </section>
    </>
  )
}

function AdminKnowledgeCandidatesList() {
  const { language, messages } = useTranslation()
  const [status, setStatus] = React.useState<KnowledgeCandidateStatus>("pending")
  const candidatesQuery = useAdminKnowledgeCandidates({ status, size: 20 })
  const candidates =
    candidatesQuery.data?.pages.flatMap((page) => page.items) ?? []
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })

  return (
    <section aria-labelledby="admin-knowledge-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-knowledge-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.knowledge.title}
        </h1>
      </header>

      <div className="max-w-sm space-y-2 rounded-2xl border border-gray-100 bg-white p-5">
        <label
          htmlFor="admin-knowledge-status"
          className="block text-body-medium-14 text-gray-700"
        >
          {messages.admin.knowledge.status}
        </label>
        <select
          id="admin-knowledge-status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as KnowledgeCandidateStatus)
          }
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="invalidated">invalidated</option>
        </select>
      </div>

      {candidatesQuery.isPending ? (
        <AdminAsyncState kind="loading" />
      ) : candidatesQuery.isError && candidates.length === 0 ? (
        <AdminAsyncState
          kind="error"
          onRetry={() => void candidatesQuery.refetch()}
          retryDisabled={candidatesQuery.isFetching}
          isRetrying={candidatesQuery.isFetching}
        />
      ) : candidates.length === 0 ? (
        <AdminAsyncState kind="empty" />
      ) : (
        <div className="space-y-4">
          {candidatesQuery.isError && !candidatesQuery.isFetchNextPageError && (
            <AdminAsyncState
              kind="error"
              onRetry={() => void candidatesQuery.refetch()}
              retryDisabled={candidatesQuery.isFetching}
              isRetrying={candidatesQuery.isFetching}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.knowledge.title}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.subject}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.predicate}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.object}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.source}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.confidence}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.createdAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.detail}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {candidates.map((candidate) => (
                  <tr key={candidate.candidateId}>
                    <td className="px-4 py-3">{candidate.candidateId}</td>
                    <td className="px-4 py-3">{candidate.status}</td>
                    <td className="px-4 py-3">{candidate.subject}</td>
                    <td className="px-4 py-3">{candidate.predicate}</td>
                    <td className="px-4 py-3">{candidate.object}</td>
                    <td className="px-4 py-3">
                      #{candidate.sourceId} · {candidate.chunkId}
                    </td>
                    <td className="px-4 py-3">{candidate.confidence ?? "—"}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(candidate.createdAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={routes.adminKnowledgeCandidate(candidate.candidateId)}
                        className="inline-flex rounded-lg px-2 py-1 text-body-medium-14 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {messages.admin.knowledge.detail}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {candidatesQuery.isFetchNextPageError ? (
            <AdminAsyncState
              kind="error"
              onRetry={() => void candidatesQuery.fetchNextPage({ cancelRefetch: false })}
              retryDisabled={candidatesQuery.isFetching}
              isRetrying={candidatesQuery.isFetching}
            />
          ) : candidatesQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void candidatesQuery.fetchNextPage({ cancelRefetch: false })}
                disabled={candidatesQuery.isFetching}
                aria-busy={candidatesQuery.isFetching || undefined}
              >
                {candidatesQuery.isFetchingNextPage
                  ? messages.admin.common.loading
                  : messages.admin.common.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function AdminKnowledgeCandidateDetailPage({
  candidateId,
}: {
  candidateId: number
}) {
  const { language, messages } = useTranslation()
  const detailQuery = useAdminKnowledgeCandidateDetail(candidateId)
  const approveMutation = useApproveAdminKnowledgeCandidate(candidateId)
  const rejectMutation = useRejectAdminKnowledgeCandidate(candidateId)
  const [activeMutationAction, setActiveMutationAction] =
    React.useState<KnowledgeCandidateAction | null>(null)
  const [refreshingDecision, setRefreshingDecision] = React.useState(false)
  const [conflictRefreshed, setConflictRefreshed] = React.useState(false)
  const [convergenceError, setConvergenceError] = React.useState(false)
  const candidate = detailQuery.data
  const mutationError = approveMutation.isError
    ? approveMutation.error
    : rejectMutation.isError
      ? rejectMutation.error
      : null
  const actionError =
    mutationError && !isKnowledgeCandidateConflict(mutationError) && !refreshingDecision
      ? getApiErrorMessage(mutationError, messages.admin.common.loadError)
      : null
  const canAct = candidate?.status === "pending"
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })

  const refreshCanonicalCandidate = async (error: unknown) => {
    setRefreshingDecision(true)
    setConvergenceError(false)

    try {
      const refreshResult = await detailQuery.refetch({ cancelRefetch: true })
      if (refreshResult.isError || refreshResult.data === undefined) {
        setConvergenceError(true)
        return
      }
      setConflictRefreshed(isKnowledgeCandidateConflict(error))
    } catch {
      setConvergenceError(true)
    } finally {
      setRefreshingDecision(false)
      setActiveMutationAction(null)
    }
  }

  const handleApprove = ({
    subject,
    predicate,
    object,
  }: {
    subject: string
    predicate: KnowledgeRelationPredicate
    object: string
  }) => {
    if (!candidate || !canAct || refreshingDecision) return

    approveMutation.reset()
    rejectMutation.reset()
    setActiveMutationAction("approve")
    setConflictRefreshed(false)
    approveMutation.mutate(
      {
        version: candidate.version,
        subject,
        predicate,
        object,
      },
      {
        onSettled: (_data, error) => {
          void refreshCanonicalCandidate(error)
        },
      },
    )
  }

  const handleReject = (reason: string | null) => {
    if (!candidate || !canAct || refreshingDecision) return

    approveMutation.reset()
    rejectMutation.reset()
    setActiveMutationAction("reject")
    setConflictRefreshed(false)
    rejectMutation.mutate(
      {
        version: candidate.version,
        ...(reason === null ? {} : { reason }),
      },
      {
        onSettled: (_data, error) => {
          void refreshCanonicalCandidate(error)
        },
      },
    )
  }

  if (detailQuery.isPending) {
    return <AdminAsyncState kind="loading" />
  }

  if (detailQuery.isError && candidate === undefined) {
    return (
      <AdminAsyncState
        kind="error"
        onRetry={() => void detailQuery.refetch()}
        retryDisabled={detailQuery.isFetching}
        isRetrying={detailQuery.isFetching}
      />
    )
  }

  if (candidate === undefined) {
    return <AdminAsyncState kind="empty" message={messages.route.invalidLink} />
  }

  return (
    <section aria-labelledby="admin-knowledge-detail-title" className="space-y-6">
      <header className="space-y-1">
        <Link
          href={routes.adminKnowledge()}
          className="text-body-medium-14 text-primary underline-offset-4 hover:underline"
        >
          {messages.admin.knowledge.backToList}
        </Link>
        <h1 id="admin-knowledge-detail-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.knowledge.detail} #{candidate.candidateId}
        </h1>
        <p className="text-body-regular-14 text-gray-600">{candidate.status}</p>
      </header>

      {detailQuery.isError && !refreshingDecision && (
        <AdminAsyncState
          kind="error"
          onRetry={() => void detailQuery.refetch()}
          retryDisabled={detailQuery.isFetching}
          isRetrying={detailQuery.isFetching}
        />
      )}

      <section aria-labelledby="admin-knowledge-context-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-knowledge-context-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.knowledge.context}
        </h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="ID" value={candidate.candidateId} />
          <DetailField label={messages.admin.knowledge.version} value={candidate.version} />
          <DetailField label={messages.admin.knowledge.status} value={candidate.status} />
          <DetailField
            label={messages.admin.knowledge.createdAt}
            value={formatDateTime(candidate.createdAt, dateFormatter)}
          />
          <DetailField
            label={messages.admin.knowledge.updatedAt}
            value={formatDateTime(candidate.updatedAt, dateFormatter)}
          />
          <DetailField
            label={messages.admin.knowledge.resolvedAt}
            value={formatDateTime(candidate.resolvedAt, dateFormatter)}
          />
          <DetailField
            label={messages.admin.knowledge.source}
            value={`#${candidate.source.sourceId} · ${candidate.source.sourceType}`}
          />
          <DetailField
            label={messages.admin.knowledge.sourceStatus}
            value={`${candidate.source.status} · ${candidate.source.active ? "active" : "inactive"}`}
          />
        </dl>
        <dl className="grid gap-3 md:grid-cols-2">
          <DetailField
            label={messages.admin.knowledge.sourceTitle}
            value={candidate.source.title ?? "—"}
          />
          <DetailField
            label={messages.admin.knowledge.sourceUrl}
            value={candidate.source.canonicalUrl ?? "—"}
          />
        </dl>
      </section>

      <section aria-labelledby="admin-knowledge-evidence-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-knowledge-evidence-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.knowledge.evidence}
        </h2>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-body-regular-14 text-gray-900">
          {candidate.evidenceText}
        </p>
        <dl className="grid gap-3 md:grid-cols-3">
          <DetailField
            label={messages.admin.knowledge.chunk}
            value={candidate.chunkId}
          />
          <DetailField
            label={messages.admin.knowledge.confidence}
            value={candidate.confidence ?? "—"}
          />
          <DetailField
            label={messages.admin.knowledge.sourceEligibility}
            value={
              candidate.sourceEligibility.eligible
                ? messages.admin.knowledge.eligible
                : (candidate.sourceEligibility.reason ?? messages.admin.knowledge.notEligible)
            }
          />
        </dl>
      </section>

      <section aria-labelledby="admin-knowledge-same-source-title" className="space-y-4">
        <h2 id="admin-knowledge-same-source-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.knowledge.sameSourceRelations}
        </h2>
        {candidate.sameSourceRelations.length === 0 ? (
          <AdminAsyncState kind="empty" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <caption className="sr-only">
                {messages.admin.knowledge.sameSourceRelations}
              </caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.subject}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.predicate}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.object}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.knowledge.chunk}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {candidate.sameSourceRelations.map((relation) => (
                  <tr key={relation.relationId}>
                    <td className="px-4 py-3">{relation.relationId}</td>
                    <td className="px-4 py-3">{relation.subject}</td>
                    <td className="px-4 py-3">{relation.predicate}</td>
                    <td className="px-4 py-3">{relation.object}</td>
                    <td className="px-4 py-3">{relation.evidenceChunkId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {refreshingDecision && <AdminAsyncState kind="loading" />}
      {convergenceError && (
        <AdminAsyncState
          kind="error"
          message={messages.admin.knowledge.convergenceError}
          onRetry={() => void refreshCanonicalCandidate(mutationError)}
        />
      )}
      {conflictRefreshed && (
        <p role="status" className="rounded-xl bg-yellow-50 p-4 text-body-regular-14 text-gray-900">
          {messages.admin.knowledge.conflictRefreshed}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-body-regular-14 text-red">
          {actionError}
        </p>
      )}

      {canAct ? (
        <AdminKnowledgeCandidateDecisionForm
          key={`${candidate.candidateId}:${candidate.version}`}
          candidate={candidate}
          refreshBusy={refreshingDecision}
          activeMutationAction={activeMutationAction}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ) : (
        <section aria-labelledby="admin-knowledge-readonly-title" className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <h2 id="admin-knowledge-readonly-title" className="text-title-semibold-18 text-gray-900">
            {messages.admin.knowledge.review}
          </h2>
          <p className="text-body-regular-14 text-gray-700">
            {candidate.status}
            {candidate.rejectionReason ? ` · ${candidate.rejectionReason}` : ""}
          </p>
        </section>
      )}
    </section>
  )
}

export { AdminKnowledgeCandidateDetailPage, AdminKnowledgeCandidatesList }
