"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { findAnsweredAdminInquiry } from "@/features/admin/inquiries/api/admin-inquiries-api"
import type {
  AdminInquiryItem,
  AdminInquiryStatus,
} from "@/features/admin/inquiries/api/admin-inquiries-api"
import {
  useAdminInquiries,
  useAnswerAdminInquiry,
} from "@/features/admin/inquiries/hooks/use-admin-inquiries"
import {
  initialAdminInquiryAnswerConvergenceState,
  isAdminInquiryAnswerConvergenceLocked,
  normalizeInquiryAnswer,
  reduceAdminInquiryAnswerConvergence,
  shouldShowAdminInquiryAnsweredConflict,
} from "@/features/admin/inquiries/lib/admin-inquiry"
import type {
  AdminInquiryAnswerConvergenceReason,
  AdminInquiryAnswerConvergenceState,
} from "@/features/admin/inquiries/lib/admin-inquiry"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"

type AnswerLatchState = "idle" | "mutation" | "refreshing" | "retry"

interface AdminInquiryAnswerResolution {
  inquiry: AdminInquiryItem
  showConflict: boolean
}

interface AdminInquiryAnsweredDetailsProps {
  inquiry: AdminInquiryItem
  dateFormatter: Intl.DateTimeFormat
  showConflict: boolean
}

interface AdminInquiryExpandedRowProps {
  inquiry: AdminInquiryItem
  dateFormatter: Intl.DateTimeFormat
  answerBusy: boolean
  answerError: string | null
  convergenceState: AdminInquiryAnswerConvergenceState
  onAnswerSubmit: (inquiry: AdminInquiryItem, answer: string) => void
  onConvergenceRetry: () => void
}

function isInquiryAlreadyAnsweredError(error: unknown) {
  return getApiErrorCode(error) === "INQUIRY_ALREADY_ANSWERED"
}

function formatDateTime(value: string | null, formatter: Intl.DateTimeFormat) {
  return value === null ? "—" : formatter.format(new Date(value))
}

function AdminInquiryAnsweredDetails({
  inquiry,
  dateFormatter,
  showConflict,
}: AdminInquiryAnsweredDetailsProps) {
  const { messages } = useTranslation()

  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      <div className="space-y-2">
        <h3 className="text-body-medium-14 text-gray-900">{inquiry.title}</h3>
        <p className="whitespace-pre-wrap text-body-regular-14 text-gray-900">
          {inquiry.content}
        </p>
      </div>
      <dl className="grid gap-3 md:grid-cols-3">
        <div>
          <dt className="text-body-medium-14 text-gray-600">
            {messages.admin.inquiries.answer}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-body-regular-14 text-gray-900">
            {inquiry.answer ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-body-medium-14 text-gray-600">
            {messages.admin.inquiries.answeredBy}
          </dt>
          <dd className="mt-1 text-body-regular-14 text-gray-900">
            {inquiry.answeredBy ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-body-medium-14 text-gray-600">
            {messages.admin.inquiries.answeredAt}
          </dt>
          <dd className="mt-1 text-body-regular-14 text-gray-900">
            {formatDateTime(inquiry.answeredAt, dateFormatter)}
          </dd>
        </div>
      </dl>
      {showConflict && (
        <p
          role="status"
          className="rounded-xl bg-yellow-50 p-3 text-body-regular-14 text-gray-900"
        >
          {messages.admin.inquiries.answeredConflict}
        </p>
      )}
    </div>
  )
}

function AdminInquiryExpandedRow({
  inquiry,
  dateFormatter,
  answerBusy,
  answerError,
  convergenceState,
  onAnswerSubmit,
  onConvergenceRetry,
}: AdminInquiryExpandedRowProps) {
  const { messages } = useTranslation()
  const [draft, setDraft] = React.useState("")
  const normalizedAnswer = normalizeInquiryAnswer(draft)

  const handleAnswerFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const answer = normalizeInquiryAnswer(draft)
    if (answer === null) return
    onAnswerSubmit(inquiry, answer)
  }

  if (inquiry.status === "answered") {
    return (
      <AdminInquiryAnsweredDetails
        inquiry={inquiry}
        dateFormatter={dateFormatter}
        showConflict={shouldShowAdminInquiryAnsweredConflict(convergenceState)}
      />
    )
  }

  return (
    <div className="space-y-4 rounded-xl bg-gray-50 p-4">
      <div className="space-y-2">
        <h3 className="text-body-medium-14 text-gray-700">
          {messages.admin.inquiries.content}
        </h3>
        <p className="whitespace-pre-wrap text-body-regular-14 text-gray-900">
          {inquiry.content}
        </p>
      </div>

      {convergenceState.kind === "retry" && (
        <AdminAsyncState
          kind="error"
          message={messages.admin.inquiries.convergenceError}
          onRetry={onConvergenceRetry}
        />
      )}
      {answerError && (
        <p role="alert" className="text-body-regular-14 text-red">
          {answerError}
        </p>
      )}
      {draft.length > 0 && normalizedAnswer === null && (
        <p role="alert" className="text-body-regular-14 text-red">
          {messages.admin.inquiries.invalidAnswer}
        </p>
      )}

      <form
        className="space-y-3"
        aria-busy={answerBusy || undefined}
        onSubmit={handleAnswerFormSubmit}
      >
        <label
          htmlFor={`admin-inquiry-answer-${inquiry.inquiryId}`}
          className="block text-body-medium-14 text-gray-700"
        >
          {messages.admin.inquiries.answer}
        </label>
        <textarea
          id={`admin-inquiry-answer-${inquiry.inquiryId}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={6}
          disabled={answerBusy}
          placeholder={messages.admin.inquiries.answerPlaceholder}
          className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={answerBusy || normalizedAnswer === null}
          aria-busy={answerBusy || undefined}
        >
          {messages.admin.inquiries.answerSubmit}
        </Button>
      </form>
    </div>
  )
}

function AdminInquiriesPage() {
  const { language, messages } = useTranslation()
  const [status, setStatus] = React.useState<AdminInquiryStatus | "">("")
  const [selectedInquiryId, setSelectedInquiryId] = React.useState<number | null>(null)
  const [answerBusyInquiryId, setAnswerBusyInquiryId] = React.useState<number | null>(null)
  const [answerTarget, setAnswerTarget] = React.useState<AdminInquiryItem | null>(null)
  const [resolvedAnswer, setResolvedAnswer] =
    React.useState<AdminInquiryAnswerResolution | null>(null)
  const [convergenceState, setConvergenceState] =
    React.useState<AdminInquiryAnswerConvergenceState>(
      initialAdminInquiryAnswerConvergenceState,
    )
  const answerLatch = React.useRef<AnswerLatchState>("idle")
  const inquiriesQuery = useAdminInquiries({ status, size: 20 })
  const answerMutation = useAnswerAdminInquiry(selectedInquiryId ?? 0)
  const inquiries = inquiriesQuery.data?.pages.flatMap((page) => page.items) ?? []
  const visibleInquiryIds = inquiries.map((inquiry) => inquiry.inquiryId).join(",")
  const [previousVisibleInquiryIds, setPreviousVisibleInquiryIds] =
    React.useState(visibleInquiryIds)
  const selectedInquiryExists =
    selectedInquiryId === null ||
    inquiries.some((inquiry) => inquiry.inquiryId === selectedInquiryId)
  const answerTargetIsVisible =
    answerTarget === null ||
    inquiries.some((inquiry) => inquiry.inquiryId === answerTarget.inquiryId)
  const answerBusy =
    answerBusyInquiryId !== null ||
    answerMutation.isPending ||
    isAdminInquiryAnswerConvergenceLocked(convergenceState)
  const listBusy = inquiriesQuery.isFetching || answerBusy
  const answerError =
    answerMutation.isError &&
    !isInquiryAlreadyAnsweredError(answerMutation.error) &&
    !isAdminInquiryAnswerConvergenceLocked(convergenceState)
      ? getApiErrorMessage(answerMutation.error, messages.admin.common.loadError)
      : null
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  if (previousVisibleInquiryIds !== visibleInquiryIds) {
    setPreviousVisibleInquiryIds(visibleInquiryIds)
    if (selectedInquiryId !== null && !selectedInquiryExists) {
      setSelectedInquiryId(null)
    }
  }

  const releaseAnswerLock = () => {
    answerLatch.current = "idle"
    setAnswerBusyInquiryId(null)
    setAnswerTarget(null)
  }

  const refreshAnswerConvergence = async (
    refreshingState: Extract<
      AdminInquiryAnswerConvergenceState,
      { kind: "refreshing" }
    >,
    targetInquiry: AdminInquiryItem,
  ) => {
    let nextState: AdminInquiryAnswerConvergenceState

    try {
      const refreshResult = await inquiriesQuery.refetch({ cancelRefetch: true })

      if (refreshResult.isError || refreshResult.data === undefined) {
        nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
          type: "refetch-failed",
        })
      } else {
        const refreshedInquiry = refreshResult.data.pages
          .flatMap((page) => page.items)
          .find((item) => item.inquiryId === targetInquiry.inquiryId)
        const recoveredInquiry =
          refreshedInquiry === undefined && status === "pending"
            ? await findAnsweredAdminInquiry(targetInquiry.inquiryId)
            : null
        const canonicalInquiry = refreshedInquiry ?? recoveredInquiry

        if (canonicalInquiry === null || canonicalInquiry === undefined) {
          nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
            type: "refetch-failed",
          })
        } else {
          nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
            type: "refetch-succeeded",
            inquiryStatus: canonicalInquiry.status,
          })
          if (canonicalInquiry.status === "answered") {
            setResolvedAnswer({
              inquiry: canonicalInquiry,
              showConflict: refreshingState.reason === "conflict",
            })
          }
        }
      }
    } catch {
      nextState = reduceAdminInquiryAnswerConvergence(refreshingState, {
        type: "refetch-failed",
      })
    }

    setConvergenceState(nextState)
    if (isAdminInquiryAnswerConvergenceLocked(nextState)) {
      answerLatch.current = "retry"
      return
    }

    releaseAnswerLock()
  }

  const beginAnswerConvergence = (
    reason: AdminInquiryAnswerConvergenceReason,
    targetInquiry: AdminInquiryItem,
  ) => {
    const refreshingState = reduceAdminInquiryAnswerConvergence(
      initialAdminInquiryAnswerConvergenceState,
      { type: "begin", reason },
    )
    if (refreshingState.kind !== "refreshing") return

    answerLatch.current = "refreshing"
    setConvergenceState(refreshingState)
    void refreshAnswerConvergence(refreshingState, targetInquiry)
  }

  const retryAnswerConvergence = () => {
    if (
      answerLatch.current !== "retry" ||
      convergenceState.kind !== "retry" ||
      answerTarget === null
    ) return

    const refreshingState = reduceAdminInquiryAnswerConvergence(
      convergenceState,
      { type: "retry" },
    )
    if (refreshingState.kind !== "refreshing") return

    answerLatch.current = "refreshing"
    setConvergenceState(refreshingState)
    void refreshAnswerConvergence(refreshingState, answerTarget)
  }

  const handleAnswerSubmit = (inquiry: AdminInquiryItem, answer: string) => {
    if (answerLatch.current !== "idle") return

    setResolvedAnswer(null)
    setAnswerTarget(inquiry)
    answerMutation.reset()
    answerLatch.current = "mutation"
    setAnswerBusyInquiryId(inquiry.inquiryId)
    answerMutation.mutate({ answer }, {
      onSettled: (_data, error) => {
        const reason =
          error === null
            ? "success"
            : isInquiryAlreadyAnsweredError(error)
              ? "conflict"
              : "uncertain"
        beginAnswerConvergence(reason, inquiry)
      },
    })
  }

  const handleInquiryToggle = (inquiryId: number, isExpanded: boolean) => {
    answerMutation.reset()
    setConvergenceState(initialAdminInquiryAnswerConvergenceState)
    setResolvedAnswer(null)
    setSelectedInquiryId(isExpanded ? null : inquiryId)
  }

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    answerMutation.reset()
    setConvergenceState(initialAdminInquiryAnswerConvergenceState)
    setResolvedAnswer(null)
    setSelectedInquiryId(null)
    setStatus(event.target.value as AdminInquiryStatus | "")
  }

  return (
    <section aria-labelledby="admin-inquiries-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-inquiries-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.inquiries.title}
        </h1>
      </header>

      <div className="max-w-sm space-y-2 rounded-2xl border border-gray-100 bg-white p-5">
        <label
          htmlFor="admin-inquiry-status"
          className="block text-body-medium-14 text-gray-700"
        >
          {messages.admin.inquiries.status}
        </label>
        <select
          id="admin-inquiry-status"
          value={status}
          onChange={handleStatusChange}
          disabled={answerBusy}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">{messages.admin.common.all}</option>
          <option value="pending">pending</option>
          <option value="answered">answered</option>
        </select>
      </div>

      {answerTarget !== null && !answerTargetIsVisible && (
        convergenceState.kind === "retry" ? (
          <AdminAsyncState
            kind="error"
            message={messages.admin.inquiries.convergenceError}
            onRetry={retryAnswerConvergence}
          />
        ) : convergenceState.kind === "refreshing" ? (
          <AdminAsyncState kind="loading" />
        ) : null
      )}

      {resolvedAnswer !== null &&
        !inquiries.some(
          (inquiry) => inquiry.inquiryId === resolvedAnswer.inquiry.inquiryId,
        ) && (
          <div aria-live="polite">
            <AdminInquiryAnsweredDetails
              inquiry={resolvedAnswer.inquiry}
              dateFormatter={dateFormatter}
              showConflict={resolvedAnswer.showConflict}
            />
          </div>
        )}

      {inquiriesQuery.isPending ? (
        <AdminAsyncState kind="loading" />
      ) : inquiriesQuery.isError &&
          inquiries.length === 0 &&
          answerBusyInquiryId === null ? (
        <AdminAsyncState
          kind="error"
          onRetry={() => void inquiriesQuery.refetch()}
          retryDisabled={inquiriesQuery.isFetching}
          isRetrying={inquiriesQuery.isFetching}
        />
      ) : inquiries.length === 0 ? (
        <AdminAsyncState kind="empty" />
      ) : (
        <div className="space-y-4">
          {inquiriesQuery.isError &&
              !inquiriesQuery.isFetchNextPageError &&
              answerBusyInquiryId === null && (
            <AdminAsyncState
              kind="error"
              onRetry={() => void inquiriesQuery.refetch()}
              retryDisabled={listBusy}
              isRetrying={listBusy}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.inquiries.title}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.inquiries.userEmail}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.inquiries.subject}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.inquiries.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.inquiries.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {inquiries.map((inquiry) => {
                  const isExpanded = inquiry.inquiryId === selectedInquiryId

                  return (
                    <React.Fragment key={inquiry.inquiryId}>
                      <tr>
                        <td className="px-4 py-3">{inquiry.inquiryId}</td>
                        <td className="px-4 py-3">
                          {inquiry.userEmail ?? messages.admin.inquiries.missingUser}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleInquiryToggle(inquiry.inquiryId, isExpanded)
                            }
                            disabled={answerBusy}
                            aria-expanded={isExpanded}
                            aria-controls={`admin-inquiry-detail-${inquiry.inquiryId}`}
                            className="rounded-lg text-left text-body-medium-14 text-primary-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:text-gray-400"
                          >
                            {inquiry.title}
                          </button>
                        </td>
                        <td className="px-4 py-3">{inquiry.status}</td>
                        <td className="px-4 py-3">
                          {dateFormatter.format(new Date(inquiry.createdAt))}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-4">
                            <div id={`admin-inquiry-detail-${inquiry.inquiryId}`}>
                              <AdminInquiryExpandedRow
                                key={inquiry.inquiryId}
                                inquiry={inquiry}
                                dateFormatter={dateFormatter}
                                answerBusy={answerBusy}
                                answerError={answerError}
                                convergenceState={convergenceState}
                                onAnswerSubmit={handleAnswerSubmit}
                                onConvergenceRetry={retryAnswerConvergence}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {inquiriesQuery.isFetchNextPageError ? (
            <AdminAsyncState
              kind="error"
              onRetry={() => void inquiriesQuery.fetchNextPage({ cancelRefetch: false })}
              retryDisabled={listBusy}
              isRetrying={listBusy}
            />
          ) : inquiriesQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void inquiriesQuery.fetchNextPage({ cancelRefetch: false })}
                disabled={listBusy}
                aria-busy={listBusy || undefined}
              >
                {inquiriesQuery.isFetchingNextPage
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

export { AdminInquiriesPage }
