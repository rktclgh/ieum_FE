"use client"

import { cn } from "@/lib/utils"

interface ScheduleCalendarDateProps {
  day: number
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
  hasMeeting: boolean
  onClick: () => void
}

function ScheduleCalendarDate({
  day,
  isCurrentMonth,
  isSelected,
  isToday,
  hasMeeting,
  onClick,
}: ScheduleCalendarDateProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="schedule-calendar-date"
      className="flex w-7 flex-col items-center gap-1"
    >
      <span
        className={cn(
          "flex h-7 w-full items-center justify-center rounded-full text-body-medium-14",
          isSelected
            ? "bg-primary text-white"
            : isToday
              ? "text-primary ring-1 ring-primary ring-inset"
              : isCurrentMonth
                ? "text-gray-900"
                : "text-gray-400"
        )}
      >
        {day}
      </span>
      <span
        className={cn(
          "size-1 rounded-full",
          !hasMeeting && "opacity-0",
          isCurrentMonth ? "bg-primary" : "bg-gray-400"
        )}
      />
    </button>
  )
}

export { ScheduleCalendarDate }
