"use client"

import { useEffect } from "react"

const CSS_VARIABLE = "--keyboard-inset"

// iOS Safari가 URL/탭 바를 접거나 펼치는 도중에도 innerHeight - visualViewport.height 가
// 수십 px 단위로 흔들린다. 이 문턱값보다 작은 변화는 키보드가 아니라 브라우저 크롬 움직임으로
// 보고 0으로 취급한다. @base-ui/react의 Drawer.VirtualKeyboardProvider가 쓰는
// KEYBOARD_RESIZE_THRESHOLD와 값을 맞춰, 같은 화면에서 공존하는 두 구현이 "키보드가 떠 있다"는
// 판단 기준을 어긋나지 않게 한다.
const KEYBOARD_RESIZE_THRESHOLD = 60

// 문서 스크롤이 애초에 일어나면 안 되는데도 iOS가 포커스된 입력창을 보이려 문서를 강제
// 스크롤해 fixed 셸을 통째로 끌어올리는(AppBar가 위로 사라지는) 화면들. 이들이 떠 있을 때만
// 스크롤을 0으로 되돌려 셸을 뷰포트에 고정한다.
//   - `[data-screen="fixed"]`      — 채팅방·일정·신고·공지(입력창을 품은 fixed inset-0 셸)
//   - `[data-slot="full-screen-overlay"]` — 홈 검색 등 전면 오버레이(자체 입력창)
// 제외한 것들:
//   - scroll 화면 — 문서 스크롤이 정상이고, 하단 fixed 바가 그 스크롤에 실려 저절로 키보드
//     위로 올라간다. 여기서 스크롤을 0으로 되돌리면 오히려 그 바가 키보드 뒤로 숨는다.
//   - bleed(홈 지도) — 직접 포커스되는 입력창이 없다(상단 검색은 button이고 실제 타이핑은
//     full-screen-overlay에서 한다, map-search-bar.tsx). 넣으면 지도 위 base-ui 시트가 자체
//     키보드 처리를 하는데 우리가 문서 스크롤까지 건드려 간섭할 여지만 생긴다.
const SCROLL_LOCK_SELECTOR = '[data-screen="fixed"],[data-slot="full-screen-overlay"]'

/**
 * iOS(PWA standalone·인앱 사파리 모두 실측)에서 가상 키보드가 뜨면:
 *  - `window.innerHeight`와 `visualViewport.height`가 함께 줄어들고(둘 다 보이는 높이가 된다),
 *  - `documentElement.clientHeight`(ICB, 레이아웃 뷰포트)는 그대로 유지되며,
 *  - iOS가 포커스된 입력창을 키보드 위로 보이려 문서를 `scrollY = 키보드 높이`만큼 밀어 올린다.
 *
 * 그 결과 `fixed inset-0` 셸이 스크롤에 끌려 올라가 AppBar가 화면 밖으로 사라지고, 종전
 * `innerHeight - visualViewport.height` 공식은 0이 되어(둘이 같이 줄었으므로) 하단 바가
 * 키보드 위로 뜨지 못했다. 실측값 402x874 기준: clientH=812, vv.h=436, scrollY=offsetTop=376.
 *
 * 그래서 스크롤 락 화면(fixed·bleed·full-screen-overlay)에서는:
 *  1. 문서 스크롤을 0으로 되돌려 셸을 뷰포트에 고정한다(AppBar 밀림 해소). 스크롤이 0이 되면
 *     iOS가 innerHeight도 원래대로 되돌리고 offsetTop도 0이 된다(실측 확인).
 *  2. 키보드가 가린 높이를 `clientHeight - visualViewport.height`(스크롤 상태와 무관하게 정확)로
 *     계산해 `--keyboard-inset`으로 노출한다.
 *
 * 락이 아닌 scroll 화면은 종전 경로를 그대로 둔다(하단 fixed 바의 스크롤 라이드-얼롱에 의존).
 * 소비 측은 `Screen kind="fixed"`(pb-[var(--keyboard-inset)]) 나 각 하단 고정 바의 pb-[...]
 * 에서 이 값을 반영한다(issue #419).
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement

    // visualViewport 미지원 환경에서는 fallback 0px 로 남겨 두고 아무것도 하지 않는다.
    if (!viewport) return

    let rafId: number | null = null

    const applyInset = () => {
      rafId = null

      // 핀치 줌 중에는 visualViewport.height 가 배율만큼 줄어들어, 키보드가 없어도 큰
      // 인셋이 계산된다(예: 2배 줌이면 innerHeight의 절반이 그대로 인셋으로 잡힌다).
      // iOS Safari는 maximum-scale=1을 무시하므로 핀치 줌은 항상 가능한 제스처다.
      // base-ui도 scale !== 1이면 계산을 건너뛰고 0으로 되돌린다 — 줌 아웃하면 다음
      // resize/scroll 이벤트가 정상값을 다시 계산해 주므로 자가 복구된다. 마지막 값을
      // 그대로 남겨 두면 줌 아웃 후에도 새 이벤트가 없는 한 틀린 값이 남을 수 있어,
      // 두 구현의 정책을 맞춰 0으로 리셋한다.
      if (viewport.scale !== 1) {
        root.style.setProperty(CSS_VARIABLE, "0px")
        return
      }

      // 스크롤 락 화면(fixed 셸·full-screen-overlay): ICB−visual 로 키보드 높이를 재고,
      // **키보드가 실제로 떠 있을 때만** 문서 스크롤을 0으로 되돌려 셸을 뷰포트에 고정한다.
      if (document.querySelector(SCROLL_LOCK_SELECTOR) !== null) {
        // clientHeight(ICB)는 키보드로 줄지 않으므로, 이 차이가 곧 키보드가 가린 높이다.
        const covered = root.clientHeight - viewport.height
        const keyboardOpen = covered > KEYBOARD_RESIZE_THRESHOLD

        // 키보드가 없을 때는 스크롤을 건드리지 않는다. 되돌리면 StandaloneViewportExpander의
        // 뷰포트 확장(812→874, body 100lvh+1px)을 되접어 하단 죽은 띠를 재도입하고 확장
        // 넛지와 밀당한다(#432와 협력). 키보드가 뜨면 iOS가 셸을 끌어올리므로 그때만 되돌린다 —
        // 입력창은 pb-[--keyboard-inset] 로 이미 키보드 위에 놓여 iOS가 다시 밀어 올리지 않는다.
        if (keyboardOpen) {
          if (window.scrollY !== 0) window.scrollTo(0, 0)
          const scroller = document.scrollingElement
          if (scroller && scroller.scrollTop !== 0) scroller.scrollTop = 0
        }

        root.style.setProperty(CSS_VARIABLE, keyboardOpen ? `${Math.round(covered)}px` : "0px")
        return
      }

      // scroll 화면(종전 경로, 변경 없음): 하단 fixed 바가 iOS 스크롤에 실려 키보드 위로
      // 올라가므로 여기서 보정하면 이중이 된다. offsetTop을 더하기 전 순수 높이 감소분으로
      // 먼저 "키보드가 맞는지"를 판단하고, 문턱값 이하면 브라우저 크롬 움직임으로 본다.
      const reducedHeight = window.innerHeight - viewport.height
      if (reducedHeight <= KEYBOARD_RESIZE_THRESHOLD) {
        root.style.setProperty(CSS_VARIABLE, "0px")
        return
      }

      const inset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
      root.style.setProperty(CSS_VARIABLE, `${Math.round(inset)}px`)
    }

    // iOS가 키보드 애니메이션 중 resize/scroll을 고빈도로 쏘기 때문에, 프레임당 한 번만
    // 쓰도록 rAF로 묶는다. 새 이벤트가 오면 이전 예약을 취소하고 다시 예약하므로,
    // 값 자체는 항상 마지막 이벤트 기준으로 계산돼 유실되지 않는다.
    const sync = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(applyInset)
    }

    sync()

    // iOS는 키보드가 뜰 때 offsetTop 이 움직이므로 resize 만으로는 부족하다. scroll 도 함께 본다.
    viewport.addEventListener("resize", sync)
    viewport.addEventListener("scroll", sync)

    return () => {
      viewport.removeEventListener("resize", sync)
      viewport.removeEventListener("scroll", sync)
      if (rafId !== null) cancelAnimationFrame(rafId)
      root.style.removeProperty(CSS_VARIABLE)
    }
  }, [])
}
