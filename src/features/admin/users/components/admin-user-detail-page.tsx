"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import type { SanctionType } from "@/features/admin/shared/types/admin-types"
import {
  useActivateAdminUser,
  useAdminUserDetail,
  useCreateAdminUserSanction,
} from "@/features/admin/users/hooks/use-admin-users"
import { validateSanctionDraft } from "@/features/admin/users/lib/admin-sanction"
import type { CreateSanctionRequest } from "@/features/admin/users/api/admin-users-api"
import { getApiErrorMessage } from "@/lib/api/errors"
import { useTranslation } from "@/lib/i18n/use-translation"

function formatDateTime(
  value: string | null,
  formatter: Intl.DateTimeFormat,
) {
  return value ? formatter.format(new Date(value)) : "—"
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

function AdminUserDetailPage({ userId }: { userId: number }) {
  const { language, messages } = useTranslation()
  const detailQuery = useAdminUserDetail(userId)
  const sanctionMutation = useCreateAdminUserSanction(userId)
  const activateMutation = useActivateAdminUser(userId)
  const [sanctionType, setSanctionType] = React.useState<SanctionType>("temporary")
  const [reason, setReason] = React.useState("")
  const [endsAt, setEndsAt] = React.useState("")
  const [invalidField, setInvalidField] = React.useState<"reason" | "endsAt" | null>(null)
  const [pendingSanction, setPendingSanction] =
    React.useState<CreateSanctionRequest | null>(null)
  const sanctionConfirmLatch = React.useRef(false)
  const activateConfirmLatch = React.useRef(false)
  const [sanctionConfirmOpen, setSanctionConfirmOpen] = React.useState(false)
  const [activateConfirmOpen, setActivateConfirmOpen] = React.useState(false)
  const [sanctionConfirmBusy, setSanctionConfirmBusy] = React.useState(false)
  const [activateConfirmBusy, setActivateConfirmBusy] = React.useState(false)
  const sanctionBusy = sanctionConfirmBusy || sanctionMutation.isPending
  const activateBusy = activateConfirmBusy || activateMutation.isPending
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const numberFormatter = new Intl.NumberFormat(language)
  const sanctionError = sanctionMutation.isError
    ? getApiErrorMessage(sanctionMutation.error, messages.admin.common.loadError)
    : null
  const activateError = activateMutation.isError
    ? getApiErrorMessage(activateMutation.error, messages.admin.common.loadError)
    : null

  const handleSanctionSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateSanctionDraft(
      { type: sanctionType, reason, endsAt },
      new Date(),
    )

    if (!result.ok) {
      setInvalidField(result.field)
      return
    }

    sanctionMutation.reset()
    setInvalidField(null)
    setPendingSanction(result.value)
    setSanctionConfirmOpen(true)
  }

  const handleSanctionConfirm = () => {
    if (!pendingSanction || sanctionConfirmLatch.current) return

    sanctionConfirmLatch.current = true
    setSanctionConfirmBusy(true)

    sanctionMutation.mutate(pendingSanction, {
      onSuccess: () => {
        setSanctionConfirmOpen(false)
        setPendingSanction(null)
        setReason("")
        setEndsAt("")
      },
      onError: () => setSanctionConfirmOpen(false),
      onSettled: () => {
        sanctionConfirmLatch.current = false
        setSanctionConfirmBusy(false)
      },
    })
  }

  const handleActivateConfirm = () => {
    if (activateConfirmLatch.current) return

    activateConfirmLatch.current = true
    setActivateConfirmBusy(true)

    activateMutation.mutate(undefined, {
      onSuccess: () => setActivateConfirmOpen(false),
      onError: () => setActivateConfirmOpen(false),
      onSettled: () => {
        activateConfirmLatch.current = false
        setActivateConfirmBusy(false)
      },
    })
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

  const { user, activity, reports, sanctions } = detailQuery.data

  return (
    <section aria-labelledby="admin-user-detail-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-user-detail-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.users.detail}
        </h1>
        <p className="text-body-regular-14 text-gray-600">{user.email}</p>
      </header>

      {detailQuery.isError && (
        <AdminAsyncState
          kind="error"
          onRetry={() => void detailQuery.refetch()}
          retryDisabled={detailQuery.isFetching}
          isRetrying={detailQuery.isFetching}
        />
      )}

      <section aria-labelledby="admin-user-profile-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-user-profile-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.users.detail}
        </h2>
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label={messages.admin.users.email} value={user.email} />
          <DetailField label={messages.admin.users.nickname} value={user.nickname} />
          <DetailField label={messages.admin.users.role} value={user.role} />
          <DetailField label={messages.admin.users.status} value={user.status} />
          <DetailField label={messages.admin.users.grade} value={user.grade} />
          <DetailField label={messages.admin.users.provider} value={user.provider} />
          <DetailField
            label={messages.admin.users.lastActiveAt}
            value={formatDateTime(user.lastActiveAt, dateFormatter)}
          />
          <DetailField
            label={messages.admin.users.birthDate}
            value={user.birthDate ?? "—"}
          />
          <DetailField label={messages.admin.users.gender} value={user.gender ?? "—"} />
          <DetailField
            label={messages.admin.users.nationality}
            value={user.nationality ?? "—"}
          />
          <DetailField
            label={messages.admin.users.profileImage}
            value={
              user.profileImageUrl ? (
                <a
                  href={user.profileImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded text-primary-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                  {user.profileImageUrl}
                </a>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </section>

      <section aria-labelledby="admin-user-activity-title" className="space-y-4">
        <h2 id="admin-user-activity-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.users.activity}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: messages.admin.users.questions, value: activity.questionCount },
            { label: messages.admin.users.answers, value: activity.answerCount },
            { label: messages.admin.users.accepted, value: activity.acceptedCount },
            { label: messages.admin.users.reported, value: activity.reportedCount },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5">
              <dt className="text-body-medium-14 text-gray-600">{item.label}</dt>
              <dd className="mt-2 text-title-bold-24 text-gray-900">
                {numberFormatter.format(item.value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="admin-user-reports-title" className="space-y-4">
        <h2 id="admin-user-reports-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.users.reports}
        </h2>
        {reports.length === 0 ? (
          <AdminAsyncState kind="empty" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.users.reports}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.reason}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.reporter}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.messageId}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.detail}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.createdAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {reports.map((report) => (
                  <tr key={report.reportId}>
                    <td className="px-4 py-3">{report.reportId}</td>
                    <td className="px-4 py-3">{report.reason}</td>
                    <td className="px-4 py-3">{report.status}</td>
                    <td className="px-4 py-3">
                      {report.reporterNickname ?? String(report.reporterId)}
                    </td>
                    <td className="px-4 py-3">{report.messageId ?? "—"}</td>
                    <td className="max-w-80 whitespace-pre-wrap px-4 py-3">
                      {report.detail ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(report.createdAt, dateFormatter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="admin-user-sanctions-title" className="space-y-4">
        <h2 id="admin-user-sanctions-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.users.sanctions}
        </h2>
        {sanctions.length === 0 ? (
          <AdminAsyncState kind="empty" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.users.sanctions}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.sanctionType}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.reason}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.createdAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.createdBy}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.endsAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.releasedAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.releasedBy}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {sanctions.map((sanction) => (
                  <tr key={sanction.sanctionId}>
                    <td className="px-4 py-3">{sanction.sanctionId}</td>
                    <td className="px-4 py-3">{sanction.type}</td>
                    <td className="max-w-80 whitespace-pre-wrap px-4 py-3">{sanction.reason}</td>
                    <td className="px-4 py-3">{formatDateTime(sanction.createdAt, dateFormatter)}</td>
                    <td className="px-4 py-3">{sanction.createdBy ?? "—"}</td>
                    <td className="px-4 py-3">{formatDateTime(sanction.endsAt, dateFormatter)}</td>
                    <td className="px-4 py-3">{formatDateTime(sanction.releasedAt, dateFormatter)}</td>
                    <td className="px-4 py-3">{sanction.releasedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="admin-user-sanction-form-title" className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
        <h2 id="admin-user-sanction-form-title" className="text-title-semibold-18 text-gray-900">
          {messages.admin.users.sanction}
        </h2>
        <form onSubmit={handleSanctionSubmit} className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-body-medium-14 text-gray-700">
            <span>{messages.admin.users.sanctionType}</span>
            <select
              value={sanctionType}
              onChange={(event) => setSanctionType(event.target.value as SanctionType)}
              disabled={sanctionBusy}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 disabled:opacity-50"
            >
              <option value="temporary">{messages.admin.users.temporary}</option>
              <option value="permanent">{messages.admin.users.permanent}</option>
            </select>
          </label>

          {sanctionType === "temporary" && (
            <label className="space-y-2 text-body-medium-14 text-gray-700">
              <span>{messages.admin.users.endsAt}</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                disabled={sanctionBusy}
                className="h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 disabled:opacity-50"
              />
            </label>
          )}

          <label className="space-y-2 text-body-medium-14 text-gray-700 lg:col-span-2">
            <span>{messages.admin.users.reason}</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              disabled={sanctionBusy}
              className="min-h-32 w-full rounded-xl border border-gray-200 p-3 text-body-regular-14 text-gray-900 outline-none focus-visible:border-primary-400 focus-visible:ring-2 focus-visible:ring-primary-100 disabled:opacity-50"
            />
          </label>

          {invalidField && (
            <p role="alert" className="text-body-regular-14 text-red lg:col-span-2">
              {invalidField === "reason"
                ? messages.admin.users.invalidReason
                : messages.admin.users.invalidEndsAt}
            </p>
          )}
          {sanctionError && (
            <p role="alert" className="text-body-regular-14 text-red lg:col-span-2">
              {sanctionError}
            </p>
          )}

          <div className="lg:col-span-2">
            <Button
              type="submit"
              variant="primary"
              disabled={sanctionBusy}
              aria-busy={sanctionBusy || undefined}
            >
              {messages.admin.users.sanction}
            </Button>
          </div>
        </form>
      </section>

      {user.status === "suspended" && (
        <section aria-labelledby="admin-user-activate-title" className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5">
          <h2 id="admin-user-activate-title" className="text-title-semibold-18 text-gray-900">
            {messages.admin.users.activate}
          </h2>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.users.activationScopeNotice}
          </p>
          {activateError && (
            <p role="alert" className="text-body-regular-14 text-red">
              {activateError}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={activateBusy}
            aria-busy={activateBusy || undefined}
            onClick={() => {
              activateMutation.reset()
              setActivateConfirmOpen(true)
            }}
          >
            {messages.admin.users.activate}
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={sanctionConfirmOpen}
        onOpenChange={(open) => {
          if (!sanctionBusy && !sanctionConfirmLatch.current) setSanctionConfirmOpen(open)
        }}
        title={messages.admin.users.sanction}
        description={pendingSanction?.reason ?? messages.admin.users.reason}
        cancelLabel={messages.admin.common.cancel}
        confirmLabel={messages.admin.users.sanction}
        onConfirm={handleSanctionConfirm}
        confirmDisabled={sanctionBusy}
      />

      <ConfirmDialog
        open={activateConfirmOpen}
        onOpenChange={(open) => {
          if (!activateBusy && !activateConfirmLatch.current) setActivateConfirmOpen(open)
        }}
        title={messages.admin.users.activationConfirm}
        description={messages.admin.users.activationScopeNotice}
        cancelLabel={messages.admin.common.cancel}
        confirmLabel={messages.admin.users.activate}
        onConfirm={handleActivateConfirm}
        confirmDisabled={activateBusy}
      />
    </section>
  )
}

export { AdminUserDetailPage }
