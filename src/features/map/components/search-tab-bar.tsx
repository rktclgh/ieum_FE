"use client"

import { Chip } from "@/components/ui/chip"
import { useTranslation } from "@/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const SEARCH_TABS = ["all", "meetup", "question", "place"] as const
type SearchTab = (typeof SEARCH_TABS)[number]

interface SearchTabBarProps {
  value: SearchTab
  onChange: (tab: SearchTab) => void
  /**
   * true면 장소 탭을 시각적으로 숨긴다. 조건부 렌더 대신 opacity/scale 토글로 처리해
   * 재노출 시 자연스럽게 애니메이션되도록 한다(이슈 #280의 MapFab 메뉴와 동일 패턴).
   */
  hidePlace?: boolean
}

function SearchTabBar({ value, onChange, hidePlace = false }: SearchTabBarProps) {
  const { messages } = useTranslation()

  const labels: Record<SearchTab, string> = {
    all: messages.home.categoryAll,
    meetup: messages.home.categoryMeetup,
    question: messages.home.categoryQuestion,
    place: messages.home.categoryPlace,
  }

  return (
    <div className="flex items-center gap-2">
      {SEARCH_TABS.map((tab) => {
        const isPlaceTab = tab === "place"
        return (
          <Chip
            key={tab}
            selected={value === tab}
            onClick={() => onChange(tab)}
            inert={isPlaceTab ? hidePlace : undefined}
            className={
              isPlaceTab
                ? cn(
                    "transition-[opacity,scale] duration-base ease-base",
                    hidePlace ? "pointer-events-none scale-95 opacity-0" : "scale-100 opacity-100"
                  )
                : undefined
            }
          >
            {labels[tab]}
          </Chip>
        )
      })}
    </div>
  )
}

export { SearchTabBar }
export type { SearchTab }
