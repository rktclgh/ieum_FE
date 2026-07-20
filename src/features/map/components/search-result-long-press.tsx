"use client"

import * as React from "react"
import { Globe } from "lucide-react"

import {
  ChatContextMenu,
  type ChatContextMenuItem,
} from "@/features/chat/components/chat-context-menu"
import { contextMenuHeight } from "@/features/chat/lib/context-menu-geometry"
import { useTranslateToggle } from "@/features/translate/hooks/use-translate-toggle"
import { useLongPress } from "@/lib/hooks/use-long-press"
import { useTranslation } from "@/lib/i18n/use-translation"

// 검색 오버레이는 하단 탭바가 없고 리스트 패딩(pb-8)만 있다. 이만큼도 남지 않으면 메뉴를 카드 위로 띄운다.
// (메뉴 높이 자체는 상수로 추정하지 않고 contextMenuHeight(items.length) 로 계산한다.)
const SEARCH_RESULT_BOTTOM_SAFE_AREA = 32

interface SearchResultLongPressRenderProps {
  /** 메뉴가 열려 있는 동안 true — 카드는 기준 리프트(@/lib/long-press-styles)를 적용한다. */
  active: boolean
  /** 번역 토글 상태가 반영된 제목/본문. 원문 대신 이 값을 렌더할 것. */
  title: string
  body: string
  /**
   * 카드에 스프레드할 롱프레스 핸들러. 번역 불가 카드에서는 빈 객체라서
   * 네이티브 컨텍스트 메뉴(데스크톱 우클릭)를 괜히 막지 않는다 — 공지 배너와 같은 처리.
   */
  longPress: Partial<ReturnType<typeof useLongPress>>
}

interface SearchResultLongPressProps {
  title: string
  /** 카드 부제(모임 설명·질문 본문). 상세 fetch 로 늦게 채워질 수 있어 카드 쪽에서 넘긴다. */
  body?: string
  isAuthenticated?: boolean
  children: (props: SearchResultLongPressRenderProps) => React.ReactNode
}

/**
 * 홈 통합검색 결과 카드의 롱프레스 상태(Figma 1951:27204).
 *
 * 카드를 길게 누르면 카드가 떠오르고 아래에 "번역" 한 항목짜리 컨텍스트 메뉴가 열린다.
 * 번역 대상 텍스트(제목·본문)가 카드 내부 상세 fetch 로 채워지는 탓에 검색 오버레이가
 * 메뉴 상태를 들 수 없어, 공지 배너(NoticeBanner)와 동일하게 카드가 자기 메뉴를 소유한다.
 * 모임·질문 카드가 이 래퍼 하나를 공유한다.
 */
function SearchResultLongPress({
  title,
  body = "",
  isAuthenticated = false,
  children,
}: SearchResultLongPressProps) {
  const { messages } = useTranslation()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")

  // 제목과 본문은 별도 문자열이라 각각 번역해야 한다(일정 화면의 제목/장소와 동일한 패턴).
  const titleTranslate = useTranslateToggle({ text: title, isAuthenticated })
  const bodyTranslate = useTranslateToggle({ text: body, isAuthenticated })

  const canTranslate = titleTranslate.canTranslate || bodyTranslate.canTranslate
  const isLoading = titleTranslate.isLoading || bodyTranslate.isLoading
  const isShowingTranslation =
    titleTranslate.isShowingTranslation || bodyTranslate.isShowingTranslation
  const isError = titleTranslate.isError || bodyTranslate.isError

  // 번역 불가(비로그인·빈 텍스트)면 항목을 숨긴다 — 공지 배너와 같은 처리라 메뉴가 통째로 사라진다.
  const menuItems: ChatContextMenuItem[] = canTranslate
    ? [
        {
          icon: <Globe className="size-6 text-gray-900" />,
          label: isLoading
            ? messages.translate.translatingLabel
            : isShowingTranslation
              ? messages.translate.viewOriginalLabel
              : messages.translate.menuLabel,
          onClick: () => {
            titleTranslate.toggle()
            bodyTranslate.toggle()
            setMenuOpen(false)
          },
        },
      ]
    : []

  const longPress = useLongPress({
    onLongPress: () => {
      if (menuItems.length === 0) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom
        setPlacement(
          spaceBelow < contextMenuHeight(menuItems.length) + SEARCH_RESULT_BOTTOM_SAFE_AREA
            ? "top"
            : "bottom"
        )
      }
      setMenuOpen(true)
    },
  })

  return (
    <div ref={containerRef} className="relative">
      {children({
        active: menuOpen,
        title: titleTranslate.displayText,
        body: bodyTranslate.displayText,
        longPress: menuItems.length > 0 ? longPress : {},
      })}
      {isError ? (
        <p className="px-1 pb-1 text-body-regular-12 text-red">
          {messages.translate.translateFailedLabel}
        </p>
      ) : null}
      {menuOpen && menuItems.length > 0 ? (
        <ChatContextMenu
          items={menuItems}
          dimmed
          onDismiss={() => setMenuOpen(false)}
          className={placement === "top" ? "bottom-full left-0 mb-5" : "top-full left-0 mt-3"}
        />
      ) : null}
    </div>
  )
}

export { SearchResultLongPress }
