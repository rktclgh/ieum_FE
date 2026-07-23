"use client"

import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { AdminContentType } from "@/features/admin/content/api/admin-content-api"
import {
  useAdminContentDetail,
  useAdminContents,
  useDeleteAdminContent,
  useUpdateAdminContent,
} from "@/features/admin/content/hooks/use-admin-content-hard-delete"
import {
  getContentResolvedLabel,
  formatParticipantCount,
  getContentStatusLabel,
} from "@/features/admin/content/lib/admin-content-labels"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { getApiErrorMessage } from "@/lib/api/errors"
import type { AdminMessages } from "@/lib/i18n/messages/admin"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface AdminContentDraft {
  title: string
  content: string
}

function getAdminContentConfirmationToken(type: AdminContentType, id: number) {
  return type === "question" ? `DELETE QUESTION ${id}` : `DELETE MEETING ${id}`
}

function parseAdminContentType(value: string | null): AdminContentType | null {
  return value === "question" || value === "meeting" ? value : null
}

function formatDateTime(
  value: string | null,
  formatter: Intl.DateTimeFormat,
) {
  return value ? formatter.format(new Date(value)) : "—"
}

function getContentTypeLabel(
  type: AdminContentType,
  messages: { admin: AdminMessages },
) {
  return type === "question"
    ? messages.admin.content.question
    : messages.admin.content.meeting
}

function validateContentDraft(draft: AdminContentDraft) {
  const title = draft.title.trim()
  const content = draft.content.trim()

  if (title.length < 1 || title.length > 200) return "title" as const
  if (content.length < 1 || content.length > 5000) return "content" as const

  return null
}

function AdminContentPage() {
  const { language, messages } = useTranslation()
  const [contentType, setContentType] =
    React.useState<AdminContentType>("question")
  const contentsQuery = useAdminContents({ type: contentType, size: 20 })
  const contents = contentsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })
  const numberFormatter = new Intl.NumberFormat(language)

  return (
    <section aria-labelledby="admin-content-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-content-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.content.title}
        </h1>
        <p className="text-body-regular-14 text-gray-600">
          {messages.admin.content.description}
        </p>
      </header>

      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="space-y-2">
          <p className="text-body-medium-14 text-gray-700">
            {messages.admin.content.search}
          </p>
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(["question", "meeting"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContentType(type)}
                className={[
                  "h-9 rounded-lg px-4 text-body-medium-14 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  contentType === type
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
                aria-pressed={contentType === type}
              >
                {getContentTypeLabel(type, messages)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {contentsQuery.isPending ? (
        <AdminAsyncState kind="loading" />
      ) : contentsQuery.isError && contents.length === 0 ? (
        <AdminAsyncState
          kind="error"
          onRetry={() => void contentsQuery.refetch()}
          retryDisabled={contentsQuery.isFetching}
          isRetrying={contentsQuery.isFetching}
        />
      ) : contents.length === 0 ? (
        <AdminAsyncState kind="empty" />
      ) : (
        <div className="space-y-4">
          {contentsQuery.isError && !contentsQuery.isFetchNextPageError && (
            <AdminAsyncState
              kind="error"
              onRetry={() => void contentsQuery.refetch()}
              retryDisabled={contentsQuery.isFetching}
              isRetrying={contentsQuery.isFetching}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.content.listTitle}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.type}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.titleField}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.resolved}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.participantCount}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.author}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.createdAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.updatedAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.deletedAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.content.openDetail}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {contents.map((item) => (
                  <tr key={`${item.contentType}-${item.contentId}`}>
                    <td className="px-4 py-3">{item.contentId}</td>
                    <td className="px-4 py-3">
                      {getContentTypeLabel(item.contentType, messages)}
                    </td>
                    <td className="max-w-96 truncate px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3">
                      {getContentStatusLabel(
                        item.contentType,
                        item.status,
                        language,
                        messages,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getContentResolvedLabel(item.contentType, item.resolved, messages)}
                    </td>
                    <td className="px-4 py-3">
                      {formatParticipantCount(
                        item.contentType,
                        item.participantCount,
                        numberFormatter,
                        messages,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.authorNickname} #{item.authorId}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(item.createdAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(item.updatedAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      {item.deletedAt === null
                        ? messages.admin.content.notDeleted
                        : formatDateTime(item.deletedAt, dateFormatter)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={routes.adminContentDetail(item.contentType, item.contentId)}
                        className="inline-flex rounded-lg px-2 py-1 text-body-medium-14 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {messages.admin.content.openDetail}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contentsQuery.isFetchNextPageError ? (
            <AdminAsyncState
              kind="error"
              onRetry={() => void contentsQuery.fetchNextPage({ cancelRefetch: false })}
              retryDisabled={contentsQuery.isFetching}
              isRetrying={contentsQuery.isFetching}
            />
          ) : contentsQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void contentsQuery.fetchNextPage({ cancelRefetch: false })}
                disabled={contentsQuery.isFetching}
                aria-busy={contentsQuery.isFetching || undefined}
              >
                {contentsQuery.isFetchingNextPage
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

function AdminContentDetailPage({
  type,
  contentId,
}: {
  type: AdminContentType
  contentId: number
}) {
  const { language, messages } = useTranslation()
  const detailQuery = useAdminContentDetail(type, contentId)
  const updateMutation = useUpdateAdminContent()
  const deleteMutation = useDeleteAdminContent()
  const [draft, setDraft] = React.useState<Partial<AdminContentDraft>>({})
  const [invalidField, setInvalidField] =
    React.useState<"title" | "content" | null>(null)
  const [confirmationToken, setConfirmationToken] = React.useState("")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const deleteLatch = React.useRef(false)
  const [deleteConfirmBusy, setDeleteConfirmBusy] = React.useState(false)
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })
  const numberFormatter = new Intl.NumberFormat(language)
  const detail = detailQuery.data
  const currentDraft = {
    title: draft.title ?? detail?.title ?? "",
    content: draft.content ?? detail?.content ?? "",
  }
  const requiredToken = getAdminContentConfirmationToken(type, contentId)
  const deleteBusy = deleteConfirmBusy || deleteMutation.isPending
  const canDelete =
    detail !== undefined && confirmationToken === requiredToken && !deleteBusy

  const handleUpdateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalid = validateContentDraft(currentDraft)
    if (invalid !== null) {
      setInvalidField(invalid)
      return
    }

    setInvalidField(null)
    updateMutation.mutate({
      type,
      id: contentId,
      body: {
        title: currentDraft.title.trim(),
        content: currentDraft.content.trim(),
      },
    })
  }

  const handleReset = () => {
    setDraft({})
    setInvalidField(null)
    updateMutation.reset()
  }

  const handleDeleteConfirm = () => {
    if (!canDelete || deleteLatch.current) return

    deleteLatch.current = true
    setDeleteConfirmBusy(true)

    deleteMutation.mutate(
      { type, id: contentId, confirmationToken },
      {
        onSuccess: () => {
          setDeleteConfirmOpen(false)
          setConfirmationToken("")
        },
        onSettled: () => {
          deleteLatch.current = false
          setDeleteConfirmBusy(false)
        },
      },
    )
  }

  if (detailQuery.isPending) {
    return <AdminAsyncState kind="loading" />
  }

  if (detailQuery.isError && detailQuery.data === undefined) {
    return (
      <AdminAsyncState
        kind="error"
        onRetry={() => void detailQuery.refetch()}
        retryDisabled={detailQuery.isFetching}
        isRetrying={detailQuery.isFetching}
      />
    )
  }

  if (detail === undefined) {
    return <AdminAsyncState kind="empty" />
  }

  return (
    <section aria-labelledby="admin-content-detail-title" className="space-y-6">
      <header className="space-y-3">
        <Link
          href={routes.adminContent()}
          className="inline-flex rounded-lg text-body-medium-14 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {messages.admin.content.backToList}
        </Link>
        <div className="space-y-1">
          <h1 id="admin-content-detail-title" className="text-title-bold-28 text-gray-900">
            {messages.admin.content.detailTitle} #{detail.contentId}
          </h1>
          <p className="text-body-regular-14 text-gray-600">
            {getContentTypeLabel(detail.contentType, messages)}
          </p>
        </div>
      </header>

      {detailQuery.isError && (
        <AdminAsyncState
          kind="error"
          onRetry={() => void detailQuery.refetch()}
          retryDisabled={detailQuery.isFetching}
          isRetrying={detailQuery.isFetching}
        />
      )}

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="text-title-semibold-18 text-gray-900">
          {messages.admin.content.preview}
        </h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.status}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {getContentStatusLabel(
                detail.contentType,
                detail.status,
                language,
                messages,
              )}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.resolved}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {getContentResolvedLabel(detail.contentType, detail.resolved, messages)}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.participantCount}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {formatParticipantCount(
                detail.contentType,
                detail.participantCount,
                numberFormatter,
                messages,
              )}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.author}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {detail.authorNickname} #{detail.authorId}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.createdAt}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {formatDateTime(detail.createdAt, dateFormatter)}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.updatedAt}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {formatDateTime(detail.updatedAt, dateFormatter)}
            </dd>
          </div>
          <div className="space-y-1 rounded-xl bg-gray-50 p-4">
            <dt className="text-body-medium-14 text-gray-600">
              {messages.admin.content.deletedAt}
            </dt>
            <dd className="break-words text-body-regular-14 text-gray-900">
              {detail.deletedAt === null
                ? messages.admin.content.notDeleted
                : formatDateTime(detail.deletedAt, dateFormatter)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="text-title-semibold-18 text-gray-900">
          {messages.admin.content.edit}
        </h2>
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <label className="space-y-2 text-body-medium-14 text-gray-700">
            <span>{messages.admin.content.titleField}</span>
            <input
              value={currentDraft.title}
              onChange={(event) => {
                setDraft((current) => ({ ...current, title: event.target.value }))
                setInvalidField(null)
                updateMutation.reset()
              }}
              maxLength={200}
              disabled={updateMutation.isPending}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-body-regular-14 text-gray-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
          </label>
          <label className="space-y-2 text-body-medium-14 text-gray-700">
            <span>{messages.admin.content.body}</span>
            <textarea
              value={currentDraft.content}
              onChange={(event) => {
                setDraft((current) => ({ ...current, content: event.target.value }))
                setInvalidField(null)
                updateMutation.reset()
              }}
              maxLength={5000}
              disabled={updateMutation.isPending}
              className="min-h-56 w-full rounded-xl border border-gray-200 p-3 text-body-regular-14 text-gray-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            />
          </label>

          {invalidField && (
            <p role="alert" className="text-body-regular-14 text-red">
              {invalidField === "title"
                ? messages.admin.content.invalidTitle
                : messages.admin.content.invalidContent}
            </p>
          )}
          {updateMutation.isError && (
            <p role="alert" className="text-body-regular-14 text-red">
              {getApiErrorMessage(updateMutation.error, messages.admin.common.loadError)}
            </p>
          )}
          {updateMutation.isSuccess && (
            <p role="status" className="text-body-regular-14 text-gray-700">
              {messages.admin.content.updateSuccess}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant="dark"
              size="md"
              disabled={updateMutation.isPending}
              aria-busy={updateMutation.isPending || undefined}
            >
              {messages.admin.content.edit}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              disabled={updateMutation.isPending}
            >
              {messages.admin.content.reset}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-white p-5">
        <div className="space-y-1">
          <h2 className="text-title-semibold-18 text-gray-900">
            {messages.admin.content.deleteSection}
          </h2>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.content.deleteDescription}
          </p>
        </div>
        <div className="space-y-2 rounded-xl bg-destructive/5 p-4">
          <p className="text-body-medium-14 text-gray-900">
            {messages.admin.content.requiredToken}
          </p>
          <code className="block rounded-lg bg-white px-3 py-2 font-mono text-body-medium-15 text-destructive">
            {requiredToken}
          </code>
          <label
            htmlFor="admin-content-confirmation"
            className="block text-body-medium-13 text-gray-700"
          >
            {messages.admin.content.confirmation}
          </label>
          <input
            id="admin-content-confirmation"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 font-mono text-body-medium-14 text-gray-900 outline-none focus:border-destructive"
            value={confirmationToken}
            disabled={deleteBusy || deleteMutation.isSuccess}
            onChange={(event) => {
              setConfirmationToken(event.target.value)
              deleteMutation.reset()
            }}
            autoComplete="off"
          />
        </div>
        {deleteMutation.isError && (
          <p role="alert" className="text-body-regular-14 text-red">
            {getApiErrorMessage(deleteMutation.error, messages.admin.common.loadError)}
          </p>
        )}
        {deleteMutation.isSuccess && (
          <p role="status" className="text-body-regular-14 text-gray-700">
            {messages.admin.content.deleteSuccess}
          </p>
        )}
        <Button
          type="button"
          variant="destructive"
          size="md"
          disabled={!canDelete || deleteMutation.isSuccess}
          aria-busy={deleteBusy || undefined}
          onClick={() => setDeleteConfirmOpen(true)}
        >
          {messages.admin.content.hardDelete}
        </Button>
      </section>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deleteBusy) setDeleteConfirmOpen(open)
        }}
        title={messages.admin.content.deleteConfirmTitle}
        description={messages.admin.content.deleteConfirmDescription}
        cancelLabel={messages.admin.common.cancel}
        confirmLabel={messages.admin.content.hardDelete}
        onConfirm={handleDeleteConfirm}
        confirmDisabled={!canDelete}
      />
    </section>
  )
}

export {
  AdminContentDetailPage,
  AdminContentPage,
  getAdminContentConfirmationToken,
  parseAdminContentType,
  validateContentDraft,
}
