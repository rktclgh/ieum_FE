"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import type { AdminContentType } from "@/features/admin/content/api/admin-content-api"
import {
  useAdminContentPreview,
  useDeleteAdminContent,
} from "@/features/admin/content/hooks/use-admin-content-hard-delete"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"
import { parsePositiveInteger } from "@/lib/navigation/routes"

interface AdminContentTarget {
  type: AdminContentType
  id: number
}

function getAdminContentConfirmationToken(type: AdminContentType, id: number) {
  return type === "question" ? `DELETE QUESTION ${id}` : `DELETE MEETING ${id}`
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value))
}

function AdminContentHardDeletePage() {
  const { language, messages } = useTranslation()
  const [contentType, setContentType] = React.useState<AdminContentType>("question")
  const [rawId, setRawId] = React.useState("")
  const [loadedTarget, setLoadedTarget] = React.useState<AdminContentTarget | null>(null)
  const [confirmationToken, setConfirmationToken] = React.useState("")
  const deleteSubmitLatch = React.useRef(false)
  const [deleteSubmitBusy, setDeleteSubmitBusy] = React.useState(false)
  const parsedId = parsePositiveInteger(rawId)
  const previewQuery = useAdminContentPreview(loadedTarget?.type ?? null, loadedTarget?.id ?? null)
  const deleteMutation = useDeleteAdminContent()
  const preview = previewQuery.data
  const requiredToken =
    loadedTarget === null ? "" : getAdminContentConfirmationToken(loadedTarget.type, loadedTarget.id)
  const deleteBusy = deleteSubmitBusy || deleteMutation.isPending
  const canDelete =
    preview !== undefined && confirmationToken === requiredToken && !deleteBusy

  const handleLoadSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (parsedId === null) return
    setConfirmationToken("")
    deleteMutation.reset()
    setLoadedTarget({ type: contentType, id: parsedId })
  }

  const handleDelete = () => {
    if (loadedTarget === null || !canDelete || deleteSubmitLatch.current) return

    deleteSubmitLatch.current = true
    setDeleteSubmitBusy(true)

    deleteMutation.mutate(
      { type: loadedTarget.type, id: loadedTarget.id, confirmationToken },
      {
        onSuccess: () => {
          setLoadedTarget(null)
          setRawId("")
          setConfirmationToken("")
        },
        onSettled: () => {
          deleteSubmitLatch.current = false
          setDeleteSubmitBusy(false)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-title-bold-24 text-gray-900">{messages.admin.content.title}</h1>
        <p className="text-body-regular-15 text-gray-600">
          {messages.admin.content.description}
        </p>
      </header>

      <form
        className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-[180px_1fr_auto]"
        onSubmit={handleLoadSubmit}
      >
        <div className="space-y-2">
          <label
            htmlFor="admin-content-type"
            className="text-body-medium-13 text-gray-700"
          >
            {messages.admin.content.type}
          </label>
          <select
            id="admin-content-type"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-body-medium-14 text-gray-900 outline-none focus:border-primary"
            value={contentType}
            disabled={deleteBusy}
            onChange={(event) => {
              setContentType(event.target.value as AdminContentType)
              setConfirmationToken("")
              deleteMutation.reset()
            }}
          >
            <option value="question">{messages.admin.content.question}</option>
            <option value="meeting">{messages.admin.content.meeting}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="admin-content-id" className="text-body-medium-13 text-gray-700">
            {messages.admin.content.contentId}
          </label>
          <input
            id="admin-content-id"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-body-medium-14 text-gray-900 outline-none focus:border-primary"
            value={rawId}
            disabled={deleteBusy}
            onChange={(event) => {
              setRawId(event.target.value.trim())
              setConfirmationToken("")
              deleteMutation.reset()
            }}
            placeholder="42"
          />
          {rawId !== "" && parsedId === null && (
            <p role="alert" className="text-body-medium-13 text-destructive">
              {messages.admin.content.invalidId}
            </p>
          )}
        </div>

        <div className="flex items-end">
          <Button
            type="submit"
            variant="dark"
            size="md"
            disabled={parsedId === null || previewQuery.isFetching || deleteBusy}
            aria-busy={previewQuery.isFetching || deleteBusy || undefined}
          >
            {messages.admin.content.loadPreview}
          </Button>
        </div>
      </form>

      {previewQuery.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-body-medium-14 text-destructive">
          {getApiErrorMessage(previewQuery.error, messages.admin.common.loadError)}
        </p>
      )}

      {deleteMutation.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-body-medium-14 text-destructive">
          {getApiErrorMessage(deleteMutation.error, messages.admin.common.loadError)}
        </p>
      )}

      {preview !== undefined && loadedTarget !== null && (
        <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-body-medium-13 text-gray-500">
                {messages.admin.content.preview}
              </p>
              <h2 className="text-title-semibold-20 text-gray-900">{preview.title}</h2>
            </div>
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-body-medium-13 text-gray-700">
              {preview.contentType === "question"
                ? messages.admin.content.question
                : messages.admin.content.meeting}{" "}
              #{preview.contentId}
            </span>
          </div>

          <dl className="grid gap-3 md:grid-cols-2">
            <div>
              <dt className="text-body-medium-12 text-gray-500">
                {messages.admin.content.author}
              </dt>
              <dd className="text-body-medium-15 text-gray-900">
                {preview.authorNickname} (#{preview.authorId})
              </dd>
            </div>
            <div>
              <dt className="text-body-medium-12 text-gray-500">
                {messages.admin.content.createdAt}
              </dt>
              <dd className="text-body-medium-15 text-gray-900">
                {formatDateTime(preview.createdAt, language)}
              </dd>
            </div>
            <div>
              <dt className="text-body-medium-12 text-gray-500">
                {messages.admin.content.deletedAt}
              </dt>
              <dd className="text-body-medium-15 text-gray-900">
                {preview.deletedAt === null
                  ? messages.admin.content.notDeleted
                  : formatDateTime(preview.deletedAt, language)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
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
              disabled={deleteBusy}
              onChange={(event) => {
                setConfirmationToken(event.target.value)
                deleteMutation.reset()
              }}
              autoComplete="off"
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            size="md"
            disabled={!canDelete}
            aria-busy={deleteBusy || undefined}
            onClick={handleDelete}
          >
            {messages.admin.content.hardDelete}
          </Button>
        </section>
      )}
    </div>
  )
}

export { AdminContentHardDeletePage, getAdminContentConfirmationToken }
