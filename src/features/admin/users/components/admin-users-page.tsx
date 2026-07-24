"use client"

import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { getUserStatusLabel } from "@/features/admin/shared/lib/admin-labels"
import type { UserStatus } from "@/features/admin/shared/types/admin-types"
import { useAdminUsers } from "@/features/admin/users/hooks/use-admin-users"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

function AdminUsersPage() {
  const { language, messages } = useTranslation()
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState<UserStatus | "">("")
  const debouncedQ = useDebouncedValue(q, 300)
  const usersQuery = useAdminUsers({ status, q: debouncedQ, size: 20 })
  const users = usersQuery.data?.pages.flatMap((page) => page.items) ?? []
  const dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  })

  return (
    <section aria-labelledby="admin-users-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-users-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.users.title}
        </h1>
      </header>

      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <label
            htmlFor="admin-user-search"
            className="block text-body-medium-14 text-gray-700"
          >
            {messages.admin.users.search}
          </label>
          <input
            id="admin-user-search"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={messages.admin.users.search}
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="admin-user-status"
            className="block text-body-medium-14 text-gray-700"
          >
            {messages.admin.users.status}
          </label>
          <select
            id="admin-user-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as UserStatus | "")}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-body-regular-14 text-gray-900 outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">{messages.admin.common.all}</option>
            <option value="active">{getUserStatusLabel("active", language)}</option>
            <option value="suspended">
              {getUserStatusLabel("suspended", language)}
            </option>
          </select>
        </div>
      </div>

      {usersQuery.isPending ? (
        <AdminAsyncState kind="loading" />
      ) : usersQuery.isError && users.length === 0 ? (
        <AdminAsyncState
          kind="error"
          onRetry={() => void usersQuery.refetch()}
          retryDisabled={usersQuery.isFetching}
          isRetrying={usersQuery.isFetching}
        />
      ) : users.length === 0 ? (
        <AdminAsyncState kind="empty" />
      ) : (
        <div className="space-y-4">
          {usersQuery.isError && !usersQuery.isFetchNextPageError && (
            <AdminAsyncState
              kind="error"
              onRetry={() => void usersQuery.refetch()}
              retryDisabled={usersQuery.isFetching}
              isRetrying={usersQuery.isFetching}
            />
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <caption className="sr-only">{messages.admin.users.title}</caption>
              <thead className="bg-gray-50 text-body-medium-14 text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.email}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.nickname}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.role}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.status}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.grade}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.provider}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.lastActiveAt}</th>
                  <th scope="col" className="px-4 py-3">{messages.admin.users.detail}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-body-regular-14 text-gray-900">
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.nickname}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3">
                      {getUserStatusLabel(user.status, language)}
                    </td>
                    <td className="px-4 py-3">{user.grade}</td>
                    <td className="px-4 py-3">{user.provider}</td>
                    <td className="px-4 py-3">
                      {user.lastActiveAt
                        ? dateFormatter.format(new Date(user.lastActiveAt))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={routes.adminUserDetail(user.userId)}
                        className="inline-flex rounded-lg px-2 py-1 text-body-medium-14 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {messages.admin.users.detail}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usersQuery.isFetchNextPageError ? (
            <AdminAsyncState
              kind="error"
              onRetry={() => void usersQuery.fetchNextPage({ cancelRefetch: false })}
              retryDisabled={usersQuery.isFetching}
              isRetrying={usersQuery.isFetching}
            />
          ) : usersQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void usersQuery.fetchNextPage({ cancelRefetch: false })}
                disabled={usersQuery.isFetching}
                aria-busy={usersQuery.isFetching || undefined}
              >
                {usersQuery.isFetchingNextPage
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

export { AdminUsersPage }
