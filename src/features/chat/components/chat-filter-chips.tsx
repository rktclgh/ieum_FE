"use client"

import * as React from "react"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"

const CATEGORIES = ["all", "friend", "meetup", "question"] as const
type ChatFilterCategory = (typeof CATEGORIES)[number]

interface ChatFilterChipsProps {
  value?: ChatFilterCategory
  onChange?: (category: ChatFilterCategory) => void
}

function ChatFilterChips({ value, onChange }: ChatFilterChipsProps) {
  const { messages } = useTranslation()
  const [uncontrolled, setUncontrolled] = React.useState<ChatFilterCategory>("all")
  const selected = value ?? uncontrolled

  const labels: Record<ChatFilterCategory, string> = {
    all: messages.home.categoryAll,
    friend: messages.home.categoryFriend,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
  }

  return (
    <div className="flex items-center gap-2">
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          tone="flat"
          selected={selected === category}
          onClick={() => {
            setUncontrolled(category)
            onChange?.(category)
          }}
        >
          {labels[category]}
        </Chip>
      ))}
    </div>
  )
}

export { ChatFilterChips }
export type { ChatFilterCategory }
