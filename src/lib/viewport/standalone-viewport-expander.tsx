"use client"

import * as React from "react"

/**
 * iOS standalone(홈 화면 추가 PWA)은 로드 시 **작은 뷰포트**(상태바 높이만큼 짧은 812)로
 * 시작해 **첫 스크롤에 큰 뷰포트**(874)로 확장되고 유지된다(docs/viewport-behavior.md).
 *
 * 홈 지도처럼 문서 스크롤이 없는 화면은 이 작은 상태에 갇혀(stuck), 화면 하단 62px이
 * 뷰포트 밖 죽은 띠로 남는다 — `height:100lvh`로 채우려 해도 812 상태에선 그 아래가
 * 애초에 그려지지 않는다. 실기기 프로브로 재현·확인했다(#419).
 *
 * 해법: `globals.css`가 standalone에서 `body`를 `100lvh + 1px`로 둬 항상 스크롤 여지를
 * 남기고, 여기서 로드 직후 스크롤 넛지로 812→874 확장을 사용자 조작 없이 강제한다.
 * 확장 뒤에도 1px 여지가 남아 다시 접히지 않는다. `pageshow`(백그라운드 복귀·키보드 닫힘
 * 뒤 재접힘 가능)에서도 재확장한다.
 *
 * `interactive-widget`은 iOS에서 무효라(#431) 이 확장은 그와 무관하게 필요하다.
 * standalone이 아니면(사파리 탭·데스크톱) 아무 것도 하지 않는다.
 */
function StandaloneViewportExpander() {
  React.useEffect(() => {
    const isStandalone =
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      matchMedia("(display-mode: standalone)").matches
    if (!isStandalone) return

    // body가 뷰포트보다 1px 높으므로 끝까지 스크롤을 시도하면 확장이 트리거된다.
    // 값은 clamp되어 실제로는 가용 최대(≈62px→확장 후 1px)까지만 이동한다.
    const nudge = () => window.scrollTo(0, 100)
    nudge()
    const raf = requestAnimationFrame(nudge)
    // 레이아웃이 자리잡는 동안 몇 번 더 시도한다(첫 프레임에 아직 stuck일 수 있다).
    const timers = [50, 150, 300, 600, 1000].map((ms) => window.setTimeout(nudge, ms))
    const onPageShow = () => nudge()
    window.addEventListener("pageshow", onPageShow)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  return null
}

export { StandaloneViewportExpander }
