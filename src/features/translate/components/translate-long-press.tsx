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
import { useLiftSurface } from "@/lib/hooks/use-lift-surface"
import { useTranslation } from "@/lib/i18n/use-translation"

// 검색 오버레이는 하단 탭바가 없고 리스트 패딩(pb-8)만 있다. 이만큼도 남지 않으면 메뉴를 카드 위로 띄운다.
// (메뉴 높이 자체는 상수로 추정하지 않고 contextMenuHeight(items.length) 로 계산한다.)
const SELF_ANCHOR_BOTTOM_SAFE_AREA = 32

/** 시트 위쪽에 뜨는 메뉴와 시트 상단 사이 간격. 시트가 4px 떠오르는 것을 감안한 값이다. */
const SURFACE_ANCHOR_CLASS = "bottom-full left-0 mb-3"

interface TranslateLongPressRenderProps {
  /** 메뉴가 열려 있는 동안 true — 대상은 기준 리프트(@/lib/long-press-styles)를 적용한다. */
  active: boolean
  /** 번역 토글 상태가 반영된 제목/본문. 원문 대신 이 값을 렌더할 것. */
  title: string
  body: string
  /**
   * 대상에 스프레드할 롱프레스 핸들러. 번역 불가 대상에서는 빈 객체라서
   * 네이티브 컨텍스트 메뉴(데스크톱 우클릭)를 괜히 막지 않는다 — 공지 배너와 같은 처리.
   */
  longPress: Partial<ReturnType<typeof useLongPress>>
}

interface TranslateLongPressProps {
  title: string
  /** 부제(모임 설명·질문 본문). 상세 fetch 로 늦게 채워질 수 있어 호출부에서 넘긴다. */
  body?: string
  isAuthenticated?: boolean
  /**
   * 메뉴 기준점.
   * - "self"(기본): 래퍼 자신을 기준으로 아래/위 공간을 재서 배치한다(검색 결과 리스트).
   * - "surface": 래퍼에 위치를 주지 않아, 메뉴가 조상 표면(바텀시트 팝업·캐러셀 카드)을
   *   기준으로 잡힌다 → 표면 바깥 위쪽, 표면 왼쪽 끝에 정렬된다.
   */
  anchor?: "self" | "surface"
  /**
   * 이 대상이 화면에 노출 중인지. false면 메뉴를 닫는다.
   * 캐러셀의 비활성 슬라이드에서 메뉴·딤이 남아 화면을 덮는 것을 막는다.
   */
  visible?: boolean
  /**
   * 번역 액션 뒤에도 메뉴와 리프트를 명시적 dismiss 전까지 유지한다.
   * 캐러셀에서 손을 떼는 순간 active 슬라이드가 바뀌어도 열린 메뉴가 사라지지 않아야 하는
   * 상세 표면만 opt-in한다. 기본값은 기존 화면의 즉시 닫힘 동작이다.
   */
  persistMenu?: boolean
  children: (props: TranslateLongPressRenderProps) => React.ReactNode
}

/**
 * 롱프레스 → "번역" 컨텍스트 메뉴(Figma 1951:27204).
 *
 * 대상을 길게 누르면 대상이 떠오르고 "번역" 한 항목짜리 메뉴가 열린다. 번역 대상 텍스트가
 * 상세 fetch 로 늦게 채워지는 화면이 있어(검색 결과 카드) 메뉴 상태는 호출부가 아니라 이
 * 래퍼가 소유한다. 홈 통합검색 리스트와 홈 상세 바텀시트가 이 래퍼 하나를 공유한다.
 *
 * 바텀시트에서는 떠올라야 할 표면이 이 래퍼가 아니라 시트 팝업이므로, `useLiftSurface` 로
 * 리프트 상태만 위로 올린다(공급자가 없으면 no-op).
 */
function TranslateLongPress({
  title,
  body = "",
  isAuthenticated = false,
  anchor = "self",
  visible = true,
  persistMenu = false,
  children,
}: TranslateLongPressProps) {
  const { messages } = useTranslation()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom")
  const setSurfaceLifted = useLiftSurface()

  // 렌더 중 상태 조정(React 권장 패턴) — 일반 대상이 가려지면 effect 없이 즉시 메뉴를 닫는다.
  // 다만 상세 카드의 지속 모드는 캐러셀 active 전환 중에도 명시적 dismiss 전까지 유지한다.
  if (!visible && menuOpen && !persistMenu) setMenuOpen(false)

  // 표면 리프트 해제는 effect 로 미룬다. 표면은 다른 컴포넌트라 렌더 중에 상태를 바꿀 수 없다.
  // 없으면 캐러셀에서 슬라이드를 넘겼을 때 메뉴만 닫히고 카드는 떠오른 채로 굳는다.
  React.useEffect(() => {
    if (!visible && !persistMenu) setSurfaceLifted(false)
  }, [visible, persistMenu, setSurfaceLifted])

  const openMenu = (open: boolean) => {
    setMenuOpen(open)
    setSurfaceLifted(open)
  }

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
            if (!persistMenu) openMenu(false)
          },
        },
      ]
    : []

  const longPress = useLongPress({
    onLongPress: () => {
      if (menuItems.length === 0) return
      // 표면 기준일 때는 항상 표면 위쪽에 붙는다 — 바텀시트 아래에는 공간이 없다.
      if (anchor === "self") {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const spaceBelow = window.innerHeight - rect.bottom
          setPlacement(
            spaceBelow < contextMenuHeight(menuItems.length) + SELF_ANCHOR_BOTTOM_SAFE_AREA
              ? "top"
              : "bottom"
          )
        }
      }
      openMenu(true)
    },
  })

  const menuClassName =
    anchor === "surface"
      ? SURFACE_ANCHOR_CLASS
      : placement === "top"
        ? "bottom-full left-0 mb-5"
        : "top-full left-0 mt-3"

  return (
    // anchor="surface" 에서는 래퍼를 positioned 로 만들지 않는다. 그래야 메뉴의 absolute 가
    // 조상 표면(시트 팝업·캐러셀 카드)을 기준으로 잡혀 표면 왼쪽 끝에 정렬된다.
    <div ref={containerRef} className={anchor === "self" ? "relative" : "contents"}>
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
          // 시트는 이미 backdrop 이 깔려 있다. 여기서 또 어둡히면 두 겹이 되므로 투명 스크림만
          // 두어 "바깥을 탭하면 메뉴만 닫힌다"는 역할만 시킨다.
          scrimClassName={anchor === "surface" ? "bg-transparent" : undefined}
          onDismiss={() => openMenu(false)}
          className={menuClassName}
        />
      ) : null}
    </div>
  )
}

export { TranslateLongPress }
