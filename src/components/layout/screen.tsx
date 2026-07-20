"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { isTabRoute } from "@/features/navigation/constants/tab-items"

/**
 * 화면의 높이 계약 — issue #419.
 *
 * 이전에는 루트 레이아웃이 높이를 정해주지 않아(세그먼트 레이아웃 7개가 전부 `AuthGate`만
 * 감싸고 DOM을 0개 기여했다) 페이지가 각자 높이 모델을 발명했고, 5종이 공존했다.
 * 그래서 페이지마다 상단·하단이 끝나는 위치가 달랐다.
 *
 * 화면은 이제 자기 **종류**만 선언하고, 높이·하단 클리어런스는 이 컴포넌트가 책임진다.
 *
 * - `scroll` — 문서가 스크롤한다. 대부분의 화면.
 * - `fixed`  — 화면에 고정되고 내부 영역만 스크롤한다. 채팅방·일정·신고·공지.
 * - `bleed`  — 전면. 홈 지도 전용.
 */
export type ScreenKind = "scroll" | "fixed" | "bleed"

const KIND_CLASSES: Record<ScreenKind, string> = {
  /*
   * 문서 스크롤을 그대로 쓴다. iOS 모멘텀 스크롤과 스크롤 위치 복원이 자연스럽고,
   * 내부 스크롤 컨테이너로 감싸면 둘 다 직접 재현해야 한다.
   */
  scroll: "app-column flex min-h-dvh flex-col",

  /*
   * `fixed inset-0`이 아니라 높이로 잡는 이유: 탭 전환 애니메이션에 `fill-mode`를 주지 않는
   * 이유가 "남은 transform이 fixed의 컨테이닝 블록이 된다"는 것이다(globals.css).
   * 페이지 높이를 `fixed`에 걸면 그 지뢰를 계속 안고 간다.
   *
   * 키보드가 올라오면 그만큼 줄어든다. `--keyboard-inset`은 `visualViewport`에서 실측한
   * 값이며(`lib/viewport/use-keyboard-inset.ts`), iOS 키보드 액세서리 바 높이만큼 항상
   * 모자란다는 알려진 한계가 있다(#328·#361). 이 컴포넌트가 그 문제를 해결하지는 않는다.
   */
  fixed: "app-column flex flex-col overflow-hidden h-[calc(100dvh-var(--keyboard-inset,0px))]",

  /*
   * 지도 전용. 스크롤 개념이 없고 문서 흐름에서 빠지는 것이 정상이다.
   * `app-column`을 붙이지 않는다 — 지도는 화면을 꽉 채우고, 그 위에 뜨는 툴바·컨트롤이
   * 각자 `app-column`으로 폭을 제한한다.
   *
   * 상·하단 인셋을 패딩으로 주지 않는다. 인셋은 CSS 변수로만 노출되고, 위에 얹히는
   * 요소들이 필요한 만큼 각자 소비한다.
   */
  bleed: "fixed inset-0 flex flex-col overflow-hidden",
}

/*
 * `as`로 태그가 바뀌므로 특정 엘리먼트에 고정된 `ComponentProps<"div">`를 쓸 수 없다
 * (`form`의 ref 타입과 충돌한다). 공통 속성만 받고 태그는 `ElementType`으로 넘긴다.
 * `onSubmit`은 `DOMAttributes`에 있으므로 `form`으로 쓸 때도 그대로 동작한다.
 */
type ScreenProps = React.HTMLAttributes<HTMLElement> & {
  kind: ScreenKind
  /** 최외곽 태그. 시맨틱이 필요한 화면에서 `main`·`form`으로 바꾼다. */
  as?: "div" | "main" | "form"
  ref?: React.Ref<HTMLElement>
  /** 콘텐츠를 화면 정중앙에 놓는다. 로딩·에러 등 상태 화면용. */
  centered?: boolean
  /**
   * 하단 탭바 클리어런스를 넣지 않는다.
   *
   * 탭 경로이면서 화면이 자체 하단 고정 바를 갖는 등, 클리어런스를 직접 관리해야 하는
   * 예외에만 쓴다. 기본값(false)이 거의 항상 옳다.
   */
  noTabClearance?: boolean
}

/**
 * 화면 루트. 페이지 컴포넌트의 최외곽 요소로 쓴다.
 *
 * 하단 클리어런스는 `isTabRoute`로 판정한다 — 탭바와 **같은 함수**를 본다. 이전에는
 * 탭바가 96px을 점유하는데 페이지는 112px + safe-area를 비워, 마지막 항목과 탭바 사이
 * 간격이 기기별로 16~50px 사이에서 변했다.
 */
function Screen({
  kind,
  as = "div",
  centered = false,
  noTabClearance = false,
  className,
  ...props
}: ScreenProps) {
  const pathname = usePathname()

  /*
   * `bleed`는 인셋을 패딩으로 주지 않는 것이 계약이므로 클리어런스에서 제외한다.
   * `fixed`는 화면 자체가 뷰포트에 갇혀 있어 탭바가 콘텐츠를 밀어낼 여지가 없다 —
   * 애초에 탭바가 뜨는 경로도 아니다(채팅방·일정·신고·공지는 전부 탭 경로가 아니다).
   */
  const needsTabClearance =
    kind === "scroll" && !noTabClearance && isTabRoute(pathname)

  const Tag = as as React.ElementType

  return (
    <Tag
      data-screen={kind}
      className={cn(
        KIND_CLASSES[kind],
        centered && "items-center justify-center",
        needsTabClearance && "pb-[var(--tab-bar-height)]",
        className
      )}
      {...props}
    />
  )
}

export { Screen }
