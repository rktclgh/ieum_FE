"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useAdminStatsOverview } from "@/features/admin/dashboard/hooks/use-admin-stats"
import { AdminAsyncState } from "@/features/admin/shared/components/admin-async-state"
import { cn } from "@/lib/utils"
import { getKstDateKey } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"

type MetricPoint = { date: string; values: Record<string, number> }
type ChartMetric = { key: string; label: string; color: string; kind?: "bar" | "line" }

const dayMs = 24 * 60 * 60 * 1000
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

function kstDateKeyToTime(dateKey: string) {
  return Date.parse(`${dateKey}T00:00:00+09:00`)
}

function defaultRange(days: number) {
  const to = getKstDateKey()
  const from = getKstDateKey(kstDateKeyToTime(to) - (days - 1) * dayMs)
  return { from, to, bucket: "day" as const }
}

function isValidDateRange(from: string, to: string) {
  if (!dateKeyPattern.test(from) || !dateKeyPattern.test(to)) return false

  const fromTime = kstDateKeyToTime(from)
  const toTime = kstDateKeyToTime(to)
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return false
  if (getKstDateKey(fromTime) !== from || getKstDateKey(toTime) !== to) return false

  const inclusiveDays = (toTime - fromTime) / dayMs + 1
  return Number.isInteger(inclusiveDays) && inclusiveDays >= 1 && inclusiveDays <= 366
}

function rangeSummary(
  title: string,
  from: string,
  to: string,
  points: MetricPoint[],
  latestPoint: MetricPoint | undefined,
) {
  const values = points.flatMap((point) => Object.values(point.values))
  const high = values.length > 0 ? Math.max(...values) : 0
  const low = values.length > 0 ? Math.min(...values) : 0
  const latest = latestPoint
    ? Object.values(latestPoint.values).reduce((sum, value) => sum + value, 0)
    : 0

  return `${title}: ${from} ~ ${to}, high ${high}, low ${low}, latest ${latest}`
}

function makePath(
  points: MetricPoint[],
  metricKey: string,
  chartWidth: number,
  chartHeight: number,
  maxValue: number,
) {
  if (points.length === 0) return ""
  if (points.length === 1) {
    const y = chartHeight - (points[0]?.values[metricKey] ?? 0) / maxValue * chartHeight
    return `M 0 ${y} L ${chartWidth} ${y}`
  }

  return points
    .map((point, index) => {
      const x = index / (points.length - 1) * chartWidth
      const value = point.values[metricKey] ?? 0
      const y = chartHeight - value / maxValue * chartHeight
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
}

function OverviewChart({
  title,
  from,
  to,
  points,
  metrics,
}: {
  title: string
  from: string
  to: string
  points: MetricPoint[]
  metrics: ChartMetric[]
}) {
  const chartWidth = 640
  const chartHeight = 180
  const latestPoint = points.at(-1)
  const ariaLabel = rangeSummary( title, from, to, points, latestPoint )
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => metrics.map((metric) => point.values[metric.key] ?? 0)),
  )

  if (points.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <h2 className="text-title-semibold-18 text-gray-900">{title}</h2>
        <AdminAsyncState kind="empty" />
      </section>
    )
  }

  const barMetrics = metrics.filter((metric) => metric.kind !== "line")
  const lineMetrics = metrics.filter((metric) => metric.kind === "line")
  const stepWidth = chartWidth / Math.max(points.length, 1)
  const barWidth = Math.max(4, stepWidth / Math.max(barMetrics.length + 1, 2))

  return (
    <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-semibold-18 text-gray-900">{title}</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-body-medium-12 text-gray-600">
          {metrics.map((metric) => (
            <li key={metric.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label={ariaLabel}
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-56 min-w-[640px] w-full"
        >
          <g aria-hidden="true">
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={chartWidth}
                y1={tick * chartHeight}
                y2={tick * chartHeight}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            {points.map((point, pointIndex) =>
              barMetrics.map((metric, metricIndex) => {
                const value = point.values[metric.key] ?? 0
                const height = value / maxValue * chartHeight
                const x = pointIndex * stepWidth + metricIndex * barWidth + barWidth / 2
                const y = chartHeight - height

                return (
                  <rect
                    key={`${point.date}-${metric.key}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    fill={metric.color}
                    rx="3"
                  />
                )
              }),
            )}
            {lineMetrics.map((metric) => (
              <path
                key={metric.key}
                d={makePath(points, metric.key, chartWidth, chartHeight, maxValue)}
                fill="none"
                stroke={metric.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            ))}
          </g>
        </svg>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">date</th>
            {metrics.map((metric) => (
              <th key={metric.key} scope="col">{metric.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              {metrics.map((metric) => (
                <td key={metric.key}>{point.values[metric.key] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function AdminDashboardPage() {
  const { language, messages } = useTranslation()
  const [range, setRange] = useState(() => defaultRange(30))
  const [draftFrom, setDraftFrom] = useState(range.from)
  const [draftTo, setDraftTo] = useState(range.to)
  const validRange = isValidDateRange(draftFrom, draftTo)
  const { data, isPending, isError, isFetching, refetch } = useAdminStatsOverview(range)
  const applyQuickRange = (days: number) => {
    const nextRange = defaultRange(days)
    setRange(nextRange)
    setDraftFrom(nextRange.from)
    setDraftTo(nextRange.to)
  }

  const countFormatter = useMemo(() => new Intl.NumberFormat(language), [language])
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [language],
  )

  if (isPending && data === undefined && !isError) {
    return <AdminAsyncState kind="loading" />
  }

  if (data === undefined) {
    return (
      <AdminAsyncState
        kind="error"
        onRetry={() => void refetch()}
        retryDisabled={isFetching}
        isRetrying={isFetching}
      />
    )
  }

  const summary = data.summary
  const seriesIsEmpty = data.series.length === 0
  const queueCards = [
    { label: messages.admin.dashboard.pendingReports, value: data.queues.pendingReportCount },
    { label: messages.admin.dashboard.retryReports, value: data.queues.retryReportCount },
    { label: messages.admin.dashboard.deadReports, value: data.queues.deadReportCount },
    { label: messages.admin.dashboard.pendingInquiries, value: data.queues.pendingInquiryCount },
  ]
  const summaryCards = [
    { label: messages.admin.dashboard.signup, value: countFormatter.format(summary.signupCount) },
    { label: messages.admin.dashboard.activeUsers, value: countFormatter.format(summary.activeUserCount) },
    { label: messages.admin.dashboard.suspendedUsers, value: countFormatter.format(summary.suspensionCount) },
    { label: messages.admin.dashboard.questions, value: countFormatter.format(summary.questionCount) },
    { label: messages.admin.dashboard.answers, value: countFormatter.format(summary.humanAnswerCount) },
    { label: messages.admin.dashboard.accepted, value: countFormatter.format(summary.acceptedHumanAnswerCount) },
    { label: messages.admin.dashboard.acceptedRate, value: percentFormatter.format(summary.acceptedRate) },
    { label: messages.admin.dashboard.reports, value: countFormatter.format(summary.reportCount) },
    { label: messages.admin.dashboard.aiReviewed, value: countFormatter.format(summary.aiReviewedCount) },
    { label: messages.admin.dashboard.confirmed, value: countFormatter.format(summary.confirmedCount) },
    { label: messages.admin.dashboard.dismissed, value: countFormatter.format(summary.dismissedCount) },
    { label: messages.admin.dashboard.sanctions, value: countFormatter.format(summary.sanctionCount) },
  ]
  const userPoints = data.series.map((point) => ({
    date: point.date,
    values: {
      [messages.admin.dashboard.signup]: point.signupCount,
      [messages.admin.dashboard.activeUsers]: point.activeUserCount,
    },
  }))
  const contentPoints = data.series.map((point) => ({
    date: point.date,
    values: {
      [messages.admin.dashboard.questions]: point.questionCount,
      [messages.admin.dashboard.answers]: point.humanAnswerCount,
      [messages.admin.dashboard.acceptedRate]: point.humanAnswerCount === 0
        ? 0
        : Math.round(point.acceptedHumanAnswerCount / point.humanAnswerCount * 100),
    },
  }))
  const reportPoints = data.series.map((point) => ({
    date: point.date,
    values: {
      [messages.admin.dashboard.reports]: point.reportCount,
      [messages.admin.dashboard.aiReviewed]: point.aiReviewedCount,
      [messages.admin.dashboard.confirmed]: point.confirmedCount,
      [messages.admin.dashboard.dismissed]: point.dismissedCount,
      [messages.admin.dashboard.sanctions]: point.sanctionCount,
    },
  }))

  return (
    <section
      aria-busy={isFetching || undefined}
      aria-labelledby="admin-dashboard-title"
      className="space-y-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 id="admin-dashboard-title" className="text-title-bold-28 text-gray-900">
            {messages.admin.dashboard.title}
          </h1>
          <p className="text-body-regular-14 text-gray-600">
            {messages.admin.dashboard.range(data.from, data.to)}
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-100 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!validRange) return
            setRange({ from: draftFrom, to: draftTo, bucket: "day" })
          }}
        >
          <div className="flex rounded-xl bg-gray-50 p-1">
            <button
              type="button"
              value={7}
              className={cn(
                "h-9 rounded-lg px-3 text-body-medium-14 text-gray-600",
                range.from === defaultRange(7).from && range.to === defaultRange(7).to
                  ? "bg-white text-gray-900 shadow-sm"
                  : "hover:text-gray-900",
              )}
              onClick={() => applyQuickRange(7)}
            >
              {messages.admin.dashboard.days(7)}
            </button>
            <button
              type="button"
              value={30}
              className={cn(
                "h-9 rounded-lg px-3 text-body-medium-14 text-gray-600",
                range.from === defaultRange(30).from && range.to === defaultRange(30).to
                  ? "bg-white text-gray-900 shadow-sm"
                  : "hover:text-gray-900",
              )}
              onClick={() => applyQuickRange(30)}
            >
              {messages.admin.dashboard.days(30)}
            </button>
            <button
              type="button"
              value={90}
              className={cn(
                "h-9 rounded-lg px-3 text-body-medium-14 text-gray-600",
                range.from === defaultRange(90).from && range.to === defaultRange(90).to
                  ? "bg-white text-gray-900 shadow-sm"
                  : "hover:text-gray-900",
              )}
              onClick={() => applyQuickRange(90)}
            >
              {messages.admin.dashboard.days(90)}
            </button>
          </div>
          <label className="space-y-1 text-body-medium-12 text-gray-600">
            {messages.admin.dashboard.from}
            <input
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="block h-9 rounded-lg border border-gray-200 px-2 text-body-regular-14 text-gray-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <label className="space-y-1 text-body-medium-12 text-gray-600">
            {messages.admin.dashboard.to}
            <input
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="block h-9 rounded-lg border border-gray-200 px-2 text-body-regular-14 text-gray-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <Button type="submit" variant="outline" disabled={!validRange}>
            {messages.admin.dashboard.applyRange}
          </Button>
          {!validRange && (
            <p role="alert" className="basis-full text-body-regular-12 text-red">
              <code className="font-semibold">INVALID_STATS_RANGE</code>
              {" "}
              {messages.admin.dashboard.invalidRange}
            </p>
          )}
        </form>
      </header>

      {isError && (
        <AdminAsyncState
          kind="error"
          message={messages.admin.dashboard.cachedError}
          onRetry={() => void refetch()}
          retryDisabled={isFetching}
          isRetrying={isFetching}
        />
      )}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queueCards.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <dt className="text-body-medium-14 text-gray-600">{metric.label}</dt>
            <dd className="mt-2 text-title-bold-24 text-gray-900 tabular-nums">
              {countFormatter.format(metric.value)}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <dt className="text-body-medium-14 text-gray-600">{metric.label}</dt>
            <dd className="mt-2 text-title-bold-24 text-gray-900 tabular-nums">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-2" data-empty={seriesIsEmpty || undefined}>
        <OverviewChart
          title={messages.admin.dashboard.userTrend}
          from={data.from}
          to={data.to}
          points={userPoints}
          metrics={[
            { key: messages.admin.dashboard.signup, label: messages.admin.dashboard.signup, color: "#2563eb", kind: "line" },
            { key: messages.admin.dashboard.activeUsers, label: messages.admin.dashboard.activeUsers, color: "#16a34a", kind: "line" },
          ]}
        />
        <OverviewChart
          title={messages.admin.dashboard.contentTrend}
          from={data.from}
          to={data.to}
          points={contentPoints}
          metrics={[
            { key: messages.admin.dashboard.questions, label: messages.admin.dashboard.questions, color: "#7c3aed" },
            { key: messages.admin.dashboard.answers, label: messages.admin.dashboard.answers, color: "#f97316" },
            { key: messages.admin.dashboard.acceptedRate, label: messages.admin.dashboard.acceptedRate, color: "#dc2626", kind: "line" },
          ]}
        />
        <div className="xl:col-span-2">
          <OverviewChart
            title={messages.admin.dashboard.reportTrend}
            from={data.from}
            to={data.to}
            points={reportPoints}
            metrics={[
              { key: messages.admin.dashboard.reports, label: messages.admin.dashboard.reports, color: "#0f766e" },
              { key: messages.admin.dashboard.aiReviewed, label: messages.admin.dashboard.aiReviewed, color: "#2563eb" },
              { key: messages.admin.dashboard.confirmed, label: messages.admin.dashboard.confirmed, color: "#16a34a", kind: "line" },
              { key: messages.admin.dashboard.dismissed, label: messages.admin.dashboard.dismissed, color: "#64748b", kind: "line" },
              { key: messages.admin.dashboard.sanctions, label: messages.admin.dashboard.sanctions, color: "#dc2626", kind: "line" },
            ]}
          />
        </div>
      </div>
      <p className="sr-only">{percentFormatter.format(summary.acceptedRate)}</p>
    </section>
  )
}

export { AdminDashboardPage }
