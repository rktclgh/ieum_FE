"use client"

import { cn } from "@/lib/utils"

interface ScheduleCalendarDateProps {
  day: number
  isCurrentMonth: boolean
  isSelected: boolean
  hasMeeting: boolean
  onClick: () => void
}

function ScheduleCalendarDate({ day, isCurrentMonth, isSelected, hasMeeting, onClick }: ScheduleCalendarDateProps) {
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
          isSelected ? "bg-primary-400 text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-400"
        )}
      >
        {day}
      </span>
      <span
        className={cn(
          "size-1 rounded-full",
          !hasMeeting && "opacity-0",
          isCurrentMonth ? "bg-primary-400" : "bg-gray-400"
        )}
      />
    </button>
  )
}

export { ScheduleCalendarDate }
