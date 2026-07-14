"use client"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"

const CATEGORIES = ["all", "meetup", "question"] as const
type Category = (typeof CATEGORIES)[number]

interface CategoryChipGroupProps {
  value: Category
  onChange: (category: Category) => void
}

function CategoryChipGroup({ value, onChange }: CategoryChipGroupProps) {
  const { messages } = useTranslation()

  const labels: Record<Category, string> = {
    all: messages.home.categoryAll,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
  }

  return (
    <div className="flex items-center gap-2">
      {CATEGORIES.map((category) => (
        <Chip key={category} selected={value === category} onClick={() => onChange(category)}>
          {labels[category]}
        </Chip>
      ))}
    </div>
  )
}

export { CategoryChipGroup }
export type { Category }
