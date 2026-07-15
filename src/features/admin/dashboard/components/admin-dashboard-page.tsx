"use client"

import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { useAdminStats } from "@/features/admin/dashboard/hooks/use-admin-stats"
import { useTranslation } from "@/lib/i18n/use-translation"

function formatAcceptedRate(value: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value * 100)

  return `${formatted}%`
}

function AdminDashboardPage() {
  const { language, messages } = useTranslation()
  const { user, content, reports, isPending, isError, refetch } = useAdminStats()

  if (isError) {
    return <AdminAsyncState kind="error" onRetry={() => void refetch()} />
  }

  if (isPending) {
    return <AdminAsyncState kind="loading" />
  }

  if (user === undefined || content === undefined || reports === undefined) {
    return <AdminAsyncState kind="error" onRetry={() => void refetch()} />
  }

  const countFormatter = new Intl.NumberFormat(language)
  const metrics = [
    { label: messages.admin.dashboard.signup, value: countFormatter.format(user.signupCount) },
    { label: messages.admin.dashboard.activeUsers, value: countFormatter.format(user.activeUserCount) },
    { label: messages.admin.dashboard.suspendedUsers, value: countFormatter.format(user.suspendedUserCount) },
    { label: messages.admin.dashboard.pins, value: countFormatter.format(content.pinCount) },
    { label: messages.admin.dashboard.questions, value: countFormatter.format(content.questionCount) },
    { label: messages.admin.dashboard.meetings, value: countFormatter.format(content.meetingCount) },
    { label: messages.admin.dashboard.answers, value: countFormatter.format(content.answerCount) },
    { label: messages.admin.dashboard.acceptedRate, value: formatAcceptedRate(content.acceptedRate, language) },
    { label: messages.admin.dashboard.messages, value: countFormatter.format(content.messageCount) },
    { label: messages.admin.dashboard.reports, value: countFormatter.format(reports.reportCount) },
    { label: messages.admin.dashboard.aiReviewed, value: countFormatter.format(reports.aiReviewedCount) },
    { label: messages.admin.dashboard.confirmed, value: countFormatter.format(reports.confirmedCount) },
    { label: messages.admin.dashboard.dismissed, value: countFormatter.format(reports.dismissedCount) },
    { label: messages.admin.dashboard.sanctions, value: countFormatter.format(reports.sanctionCount) },
  ]

  return (
    <section aria-labelledby="admin-dashboard-title" className="space-y-6">
      <header className="space-y-1">
        <h1 id="admin-dashboard-title" className="text-title-bold-28 text-gray-900">
          {messages.admin.dashboard.title}
        </h1>
        <p className="text-body-regular-14 text-gray-600">
          {messages.admin.dashboard.range(user.from, user.to)}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <dt className="text-body-medium-14 text-gray-600">{metric.label}</dt>
            <dd className="mt-2 text-title-bold-24 text-gray-900 tabular-nums">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export { AdminDashboardPage }
