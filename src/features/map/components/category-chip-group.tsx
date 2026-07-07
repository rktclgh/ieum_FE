"use client"

import * as React from "react"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"

const CATEGORIES = ["all", "meetup", "question"] as const
type Category = (typeof CATEGORIES)[number]

function CategoryChipGroup() {
  const { messages } = useTranslation()
  const [selected, setSelected] = React.useState<Category>("all")

  const labels: Record<Category, string> = {
    all: messages.home.categoryAll,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
  }

  return (
    <div className="flex items-center gap-2">
      {CATEGORIES.map((category) => (
        <Chip key={category} selected={selected === category} onClick={() => setSelected(category)}>
          {labels[category]}
        </Chip>
      ))}
    </div>
  )
}

export { CategoryChipGroup }
