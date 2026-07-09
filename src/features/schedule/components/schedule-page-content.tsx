"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { AppBar } from "@/components/ui/app-bar"
import { Circle } from "@/components/ui/circle"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { ScheduleCalendar } from "@/features/schedule/components/schedule-calendar"
import { ScheduleListItem } from "@/features/schedule/components/schedule-list-item"
import { MonthYearWheelPicker } from "@/features/schedule/components/month-year-wheel-picker"
import { MOCK_SCHEDULES } from "@/features/schedule/constants/mock-data"
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
  const [schedules, setSchedules] = React.useState(MOCK_SCHEDULES)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)

  const eventDateKeys = React.useMemo(() => new Set(schedules.map((event) => event.date)), [schedules])
  const eventsForSelectedDate = React.useMemo(
    () => schedules.filter((event) => event.date === selectedDate),
    [schedules, selectedDate]
  )

  const goToMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedDate(toDateKey(nextYear, nextMonth, 1))
  }

  const menuItemsFor = (eventId: string): ChatContextMenuItem[] => [
    {
      icon: <Image src="/icons/chat/alert.svg" alt="" width={24} height={24} />,
      label: messages.chat.reportAction,
      tone: "destructive",
      onClick: () => setActiveMenuId(null),
    },
    {
      icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
      label: messages.chat.deleteAction,
      tone: "destructive",
      onClick: () => {
        setActiveMenuId(null)
        setDeleteTargetId(eventId)
      },
    },
  ]

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

          <div className="flex flex-col gap-3 px-4">
            {eventsForSelectedDate.length === 0 ? (
              <p className="py-6 text-center text-body-regular-14 text-gray-400">
                {messages.schedule.emptyStateLabel}
              </p>
            ) : (
              eventsForSelectedDate.map((event) => (
                <div key={event.id} className="relative w-full">
                  <ScheduleListItem event={event} onMoreClick={() => setActiveMenuId(event.id)} />
                  {activeMenuId === event.id && (
                    <ChatContextMenu
                      items={menuItemsFor(event.id)}
                      dimmed
                      onDismiss={() => setActiveMenuId(null)}
                      className="top-full right-0 mt-2"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Circle
        background="primary"
        iconSrc="/icons/circle/plus-white.svg"
        aria-label={messages.schedule.addButtonLabel}
        className="absolute right-4 bottom-6 z-10"
      />

      <MonthYearWheelPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        year={year}
        month={month}
        onConfirm={goToMonth}
      />

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title={messages.schedule.deleteConfirmTitle}
        description={messages.schedule.deleteConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.chat.deleteAction}
        onConfirm={() => {
          setSchedules((prev) => prev.filter((event) => event.id !== deleteTargetId))
          setDeleteTargetId(null)
        }}
      />
    </div>
  )
}

export { SchedulePageContent }
