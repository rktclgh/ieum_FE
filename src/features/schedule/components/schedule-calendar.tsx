"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"
import { getMonthGrid, getWeekdayLabels } from "@/features/schedule/lib/calendar"
import { ScheduleCalendarDate } from "@/features/schedule/components/schedule-calendar-date"

interface ScheduleCalendarProps extends React.ComponentProps<"div"> {
  year: number
  month: number
  selectedDate: string
  todayDate: string
  onSelectDate: (dateKey: string) => void
  eventDateKeys: Set<string>
}

function ScheduleCalendar({
  className,
  year,
  month,
  selectedDate,
  todayDate,
  onSelectDate,
  eventDateKeys,
  ...props
}: ScheduleCalendarProps) {
  const { language } = useTranslation()
  const weekdayLabels = React.useMemo(() => getWeekdayLabels(language), [language])
  const cells = React.useMemo(() => getMonthGrid(year, month), [year, month])
  const weeks = React.useMemo(() => {
    const result: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [cells])

  return (
    <div data-slot="schedule-calendar" className={cn("flex w-full flex-col gap-5 px-4", className)} {...props}>
      <div className="flex items-center justify-between text-body-regular-13 text-gray-400">
        {weekdayLabels.map((label, index) => (
          <span key={index} className="w-7 text-center">
            {label}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {weeks.map((week) => (
          <div key={week[0].key} className="flex items-start justify-between">
            {week.map((cell) => (
              <ScheduleCalendarDate
                key={cell.key}
                day={cell.day}
                isCurrentMonth={cell.isCurrentMonth}
                isSelected={cell.dateKey === selectedDate}
                isToday={cell.dateKey === todayDate}
                hasMeeting={eventDateKeys.has(cell.dateKey)}
                onClick={() => onSelectDate(cell.dateKey)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { ScheduleCalendar }
