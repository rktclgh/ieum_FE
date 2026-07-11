"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { ScheduleCalendar } from "@/features/schedule/components/schedule-calendar"
import { ScheduleListItem } from "@/features/schedule/components/schedule-list-item"
import { MonthYearWheelPicker } from "@/features/schedule/components/month-year-wheel-picker"
import { useCalendar } from "@/features/schedule/hooks/use-schedule-queries"
import { useCancelSchedule } from "@/features/schedule/hooks/use-schedule-mutations"
import { getScheduleErrorMessage } from "@/features/schedule/lib/schedule-error"
import type { ScheduleEntry } from "@/features/schedule/lib/schedule-adapter"
import { formatYearMonth, toDateKey } from "@/features/schedule/lib/calendar"
import { getKstDateKey } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"

function SchedulePageContent() {
  const router = useRouter()
  const { language, messages } = useTranslation()

  // KST(Asia/Seoul) 기준 오늘 날짜를 초기 선택값/하이라이트 기준으로 사용한다.
  const [today] = React.useState(getKstDateKey)
  const [year, setYear] = React.useState(() => Number(today.slice(0, 4)))
  const [month, setMonth] = React.useState(() => Number(today.slice(5, 7)))
  const [selectedDate, setSelectedDate] = React.useState(today)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [activeMenuId, setActiveMenuId] = React.useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = React.useState<ScheduleEntry | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  // 보이는 달의 1일~말일을 캘린더 조회 기간으로 사용한다.
  const range = React.useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate()
    return { from: toDateKey(year, month, 1), to: toDateKey(year, month, lastDay) }
  }, [year, month])

  const calendarQuery = useCalendar(range)
  const cancelSchedule = useCancelSchedule()
  const entries = React.useMemo(() => calendarQuery.data ?? [], [calendarQuery.data])

  const eventDateKeys = React.useMemo(() => new Set(entries.map((event) => event.date)), [entries])
  const eventsForSelectedDate = React.useMemo(
    () => entries.filter((event) => event.date === selectedDate),
    [entries, selectedDate]
  )

  React.useEffect(() => {
    if (!actionError) return
    const timeoutId = window.setTimeout(() => setActionError(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [actionError])

  const goToMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedDate(toDateKey(nextYear, nextMonth, 1))
  }

  const cancelMenuItems = (event: ScheduleEntry): ChatContextMenuItem[] => [
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.schedule.cancelAction,
      tone: "destructive",
      onClick: () => {
        setActiveMenuId(null)
        setCancelTarget(event)
      },
    },
  ]

  const renderList = () => {
    if (calendarQuery.isPending) return null
    if (calendarQuery.isError) {
      return <p className="py-6 text-center text-body-regular-14 text-gray-400">{messages.schedule.loadError}</p>
    }
    if (eventsForSelectedDate.length === 0) {
      return <p className="py-6 text-center text-body-regular-14 text-gray-400">{messages.schedule.emptyStateLabel}</p>
    }
    return eventsForSelectedDate.map((event) => (
      <div key={event.scheduleId} className="relative w-full">
        <ScheduleListItem
          event={event}
          onSelect={() => router.push(`/chats/${event.roomId}`)}
          onMoreClick={event.isHost ? () => setActiveMenuId(event.scheduleId) : undefined}
        />
        {activeMenuId === event.scheduleId && (
          <ChatContextMenu
            items={cancelMenuItems(event)}
            dimmed
            onDismiss={() => setActiveMenuId(null)}
            className="top-full right-0 mt-2"
          />
        )}
      </div>
    ))
  }

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-sm flex-col overflow-hidden bg-white">
      <AppBar
        trailingVariant="close"
        onLeadingClick={() => router.back()}
        onTrailingClick={() => router.back()}
        className="shrink-0"
        center={
          <button
            type="button"
            aria-label={messages.schedule.selectMonthLabel}
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1"
          >
            <span className="text-title-semibold-18 text-gray-900">{formatYearMonth(language, year, month)}</span>
            <Image src="/icons/arrow/down.svg" alt="" width={24} height={24} className="size-6" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 pt-2 pb-28">
          <ScheduleCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            todayDate={today}
            onSelectDate={setSelectedDate}
            eventDateKeys={eventDateKeys}
          />

          <div className="flex flex-col gap-3 px-4">{renderList()}</div>
        </div>
      </div>

      <MonthYearWheelPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        year={year}
        month={month}
        onConfirm={goToMonth}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={messages.schedule.cancelConfirmTitle}
        description={messages.schedule.cancelConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.schedule.cancelAction}
        onConfirm={() => {
          if (!cancelTarget) return
          cancelSchedule.mutate(
            { meetingId: cancelTarget.meetingId, scheduleId: cancelTarget.scheduleId },
            { onError: (error) => setActionError(getScheduleErrorMessage(error, messages)) }
          )
          setCancelTarget(null)
        }}
      />

      {actionError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4">
          <p className="rounded-full bg-gray-900/90 px-4 py-2 text-body-regular-13 text-white">{actionError}</p>
        </div>
      )}
    </div>
  )
}

export { SchedulePageContent }
