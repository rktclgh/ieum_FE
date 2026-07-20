"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Globe } from "lucide-react"

import { RoutePageState } from "@/components/ui/route-page-state"
import { AppBar } from "@/components/ui/app-bar"
import { Circle } from "@/components/ui/circle"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ChatContextMenu, type ChatContextMenuItem } from "@/features/chat/components/chat-context-menu"
import { useChatRoom, useChatSessionAccess } from "@/features/chat/hooks/use-chat-queries"
import { useMeeting } from "@/features/meetup/hooks/use-meetup-queries"
import { getMeetupErrorMessage } from "@/features/meetup/lib/meetup-error"
import { ScheduleCalendar } from "@/features/schedule/components/schedule-calendar"
import { ScheduleEditor } from "@/features/schedule/components/schedule-editor"
import { ScheduleListItem } from "@/features/schedule/components/schedule-list-item"
import { MonthYearWheelPicker } from "@/features/schedule/components/month-year-wheel-picker"
import {
  useCreateSchedule,
  useDeleteSchedule,
  useUpdateSchedule,
} from "@/features/schedule/hooks/use-schedule-mutations"
import { useMeetingSchedules } from "@/features/schedule/hooks/use-schedule-queries"
import {
  adaptMeetingScheduleItem,
  type MeetingScheduleEntry,
} from "@/features/schedule/lib/schedule-adapter"
import { buildScheduleActions } from "@/features/schedule/lib/schedule-actions"
import { getScheduleErrorMessage } from "@/features/schedule/lib/schedule-error"
import { isPastScheduleDate, type ScheduleEditorRequest } from "@/features/schedule/lib/schedule-editor"
import { isMeetingAccessErrorCode } from "@/features/schedule/lib/schedule-query-error"
import { buildKstMonthScheduleRange } from "@/features/schedule/lib/schedule-query-range"
import { formatYearMonth, toDateKey } from "@/features/schedule/lib/calendar"
import { getApiErrorCode } from "@/lib/api/errors"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { getKstDateKey } from "@/lib/date/kst"
import { useTranslation } from "@/lib/i18n/use-translation"
import { routes } from "@/lib/navigation/routes"

interface SchedulePageContentProps {
  roomId: number
}

type ScheduleEditorState =
  | { mode: "create" }
  | { mode: "edit"; schedule: MeetingScheduleEntry }

interface ScheduleRowProps {
  event: MeetingScheduleEntry
  isAuthenticated: boolean
  menuOpen: boolean
  menuItems: ChatContextMenuItem[]
  onOpenMenu: () => void
  onCloseMenu: () => void
}

function ScheduleRow({
  event,
  isAuthenticated,
  menuOpen,
  menuItems,
  onOpenMenu,
  onCloseMenu,
}: ScheduleRowProps) {
  const { messages } = useTranslation()
  const titleTranslate = useTranslateToggle({ text: event.title, isAuthenticated })
  const locationTranslate = useTranslateToggle({ text: event.locationLabel, isAuthenticated })
  const canTranslate = titleTranslate.canTranslate || locationTranslate.canTranslate
  const isLoading = titleTranslate.isLoading || locationTranslate.isLoading
  const isShowingTranslation = titleTranslate.isShowingTranslation || locationTranslate.isShowingTranslation
  const isError = titleTranslate.isError || locationTranslate.isError

  const toggleTranslation = () => {
    if (isShowingTranslation) {
      titleTranslate.showOriginal()
      locationTranslate.showOriginal()
      return
    }
    titleTranslate.toggle()
    locationTranslate.toggle()
  }

  const translateMenuItem: ChatContextMenuItem = {
    icon: <Globe className="size-6 text-gray-900" />,
    label: isLoading
      ? messages.translate.translatingLabel
      : isShowingTranslation
        ? messages.translate.viewOriginalLabel
        : messages.translate.menuLabel,
    onClick: () => {
      toggleTranslation()
      onCloseMenu()
    },
  }

  const fullMenuItems = canTranslate ? [translateMenuItem, ...menuItems] : menuItems

  return (
    <div className="relative w-full">
      <ScheduleListItem
        event={{
          ...event,
          translatedTitle: titleTranslate.displayText,
          translatedLocationLabel: locationTranslate.displayText,
        }}
        onMoreClick={canTranslate || menuItems.length > 0 ? onOpenMenu : undefined}
        moreAriaLabel={messages.common.more}
      />
      {isError ? (
        <p className="mt-1 px-3 text-body-regular-12 text-red">{messages.translate.translateFailedLabel}</p>
      ) : null}
      {menuOpen && (
        <ChatContextMenu
          items={fullMenuItems}
          dimmed
          onDismiss={onCloseMenu}
          className="top-full right-0 mt-2"
        />
      )}
    </div>
  )
}

function SchedulePageContent({ roomId }: SchedulePageContentProps) {
  const router = useRouter()
  const { language, messages } = useTranslation()
  const session = useChatSessionAccess(roomId)
  const isAuthenticated = session.authenticated
  const roomQuery = useChatRoom(roomId, session)
  const room = roomQuery.data
  const meetingId = room?.roomType === "group" ? room.meetingId : null
  const hasMeetingLink = meetingId !== null && Number.isSafeInteger(meetingId) && meetingId > 0
  const meetingQuery = useMeeting(meetingId ?? 0, hasMeetingLink)

  // KST(Asia/Seoul) 기준 오늘 날짜를 초기 선택값/하이라이트 기준으로 사용한다.
  const [today] = React.useState(getKstDateKey)
  const [year, setYear] = React.useState(() => Number(today.slice(0, 4)))
  const [month, setMonth] = React.useState(() => Number(today.slice(5, 7)))
  const [selectedDate, setSelectedDate] = React.useState(today)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [activeMenuId, setActiveMenuId] = React.useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<MeetingScheduleEntry | null>(null)
  const [editor, setEditor] = React.useState<ScheduleEditorState | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  // OffsetDateTime controller contract에 맞춰 보이는 달 전체를 KST offset으로 조회한다.
  const range = React.useMemo(() => {
    return buildKstMonthScheduleRange(year, month)
  }, [year, month])

  const schedulesQuery = useMeetingSchedules(
    meetingId ?? 0,
    range,
    hasMeetingLink && Boolean(meetingQuery.data)
  )
  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule()
  const deleteSchedule = useDeleteSchedule()

  const entries = React.useMemo(
    () =>
      (schedulesQuery.data ?? []).map((schedule) =>
        adaptMeetingScheduleItem(schedule, meetingId ?? 0, language)
      ),
    [schedulesQuery.data, meetingId, language]
  )
  const eventDateKeys = React.useMemo(() => new Set(entries.map((event) => event.date)), [entries])
  const eventsForSelectedDate = React.useMemo(
    () => entries.filter((event) => event.date === selectedDate),
    [entries, selectedDate]
  )
  const selectedDateIsPast = isPastScheduleDate(selectedDate, today)
  const isOneTimeMeeting = meetingQuery.data?.type === "one_time"
  const isEditorPending = createSchedule.isPending || updateSchedule.isPending
  const meetingAccessError = [roomQuery.error, meetingQuery.error, schedulesQuery.error].find((error) =>
    isMeetingAccessErrorCode(getApiErrorCode(error))
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

  const openMenu = (scheduleId: number) => setActiveMenuId(scheduleId)

  const scheduleMenuItems = (event: MeetingScheduleEntry): ChatContextMenuItem[] =>
    buildScheduleActions(event).map((action) => {
      if (action === "report") {
        return {
          icon: <Image src="/icons/chat/alert.svg" alt="" width={24} height={24} />,
          label: messages.chat.reportAction,
          tone: "destructive",
          onClick: () => {
            setActiveMenuId(null)
            router.push(routes.chatScheduleReport(event.meetingId, event.scheduleId, event.title))
          },
        }
      }

      return {
        icon: <Image src="/icons/chat/trash.svg" alt="" width={24} height={24} />,
        label: messages.schedule.deleteAction,
        tone: "destructive",
        onClick: () => {
          setActiveMenuId(null)
          setDeleteTarget(event)
        },
      }
    })

  const submitEditor = (body: ScheduleEditorRequest) => {
    if (!hasMeetingLink || !editor) return

    if (editor.mode === "create") {
      createSchedule.mutate(
        { meetingId, body },
        {
          onSuccess: () => setEditor(null),
          onError: (error) => setActionError(getScheduleErrorMessage(error, messages)),
        }
      )
      return
    }

    updateSchedule.mutate(
      { meetingId, scheduleId: editor.schedule.scheduleId, body },
      {
        onSuccess: () => setEditor(null),
        onError: (error) => setActionError(getScheduleErrorMessage(error, messages)),
      }
    )
  }

  if (roomQuery.isPending || (hasMeetingLink && meetingQuery.isPending)) {
    return <RoutePageState kind="loading" />
  }

  if (meetingAccessError) {
    return (
      <main className="app-column flex min-h-dvh items-center justify-center px-4">
        <p role="alert" className="text-center text-body-medium-16 text-gray-900">
          {getMeetupErrorMessage(meetingAccessError, messages)}
        </p>
      </main>
    )
  }

  if (roomQuery.isError || meetingQuery.isError || !hasMeetingLink) {
    return <RoutePageState kind="invalid-link" />
  }

  const renderList = () => {
    if (schedulesQuery.isPending) return null
    if (schedulesQuery.isError) {
      return <p className="py-6 text-center text-body-regular-14 text-gray-400">{messages.schedule.loadError}</p>
    }
    if (eventsForSelectedDate.length === 0) {
      return <p className="py-6 text-center text-body-regular-14 text-gray-400">{messages.schedule.emptyStateLabel}</p>
    }
    return eventsForSelectedDate.map((event) => (
      <ScheduleRow
        key={event.scheduleId}
        event={event}
        isAuthenticated={isAuthenticated}
        menuOpen={activeMenuId === event.scheduleId}
        menuItems={scheduleMenuItems(event)}
        onOpenMenu={() => openMenu(event.scheduleId)}
        onCloseMenu={() => setActiveMenuId(null)}
      />
    ))
  }

  return (
    <div className="relative app-column flex h-dvh flex-col overflow-hidden bg-white">
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
        <div className="flex flex-col gap-6 pt-2 pb-[calc(7rem+var(--safe-area-bottom))]">
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

      {isOneTimeMeeting && !selectedDateIsPast ? (
        <Circle
          aria-label={messages.schedule.addButtonLabel}
          iconSrc="/icons/circle/plus-white.svg"
          background="primary"
          className="absolute right-4 bottom-[calc(1.5rem+var(--safe-area-bottom))] z-10"
          onClick={() => setEditor({ mode: "create" })}
        />
      ) : null}

      <MonthYearWheelPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        year={year}
        month={month}
        onConfirm={goToMonth}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSchedule.isPending) setDeleteTarget(null)
        }}
        title={messages.schedule.deleteConfirmTitle}
        description={messages.schedule.deleteConfirmDescription}
        cancelLabel={messages.chat.cancelButton}
        confirmLabel={messages.schedule.deleteAction}
        confirmDisabled={deleteSchedule.isPending || deleteTarget === null}
        onConfirm={() => {
          if (!deleteTarget || deleteSchedule.isPending) return
          deleteSchedule.mutate(
            { meetingId: deleteTarget.meetingId, scheduleId: deleteTarget.scheduleId },
            {
              onSuccess: () => setDeleteTarget(null),
              onError: (error) => setActionError(getScheduleErrorMessage(error, messages)),
            }
          )
        }}
      />

      <ScheduleEditor
        open={editor !== null}
        mode={editor?.mode ?? "create"}
        selectedDate={editor?.mode === "edit" ? editor.schedule.date : selectedDate}
        todayDate={today}
        schedule={editor?.mode === "edit" ? editor.schedule : undefined}
        isPending={isEditorPending}
        onClose={() => {
          if (!isEditorPending) setEditor(null)
        }}
        onSubmit={submitEditor}
      />

      {actionError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(2rem+var(--safe-area-bottom))] z-[60] flex justify-center px-4">
          <p className="rounded-full bg-gray-900/90 px-4 py-2 text-body-regular-13 text-white">{actionError}</p>
        </div>
      ) : null}
    </div>
  )
}

export { SchedulePageContent }
