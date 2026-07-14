"use client"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"

const SEARCH_TABS = ["all", "meetup", "question", "place"] as const
type SearchTab = (typeof SEARCH_TABS)[number]

interface SearchTabBarProps {
  value: SearchTab
  onChange: (tab: SearchTab) => void
}

function SearchTabBar({ value, onChange }: SearchTabBarProps) {
  const { messages } = useTranslation()

  const labels: Record<SearchTab, string> = {
    all: messages.home.categoryAll,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
    place: messages.home.categoryPlace,
  }

  return (
    <div className="flex items-center gap-2">
      {SEARCH_TABS.map((tab) => (
        <Chip key={tab} selected={value === tab} onClick={() => onChange(tab)}>
          {labels[tab]}
        </Chip>
      ))}
    </div>
  )
}

export { SearchTabBar }
export type { SearchTab }
