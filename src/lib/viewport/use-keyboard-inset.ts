"use client"

import { useEffect } from "react"

const CSS_VARIABLE = "--keyboard-inset"

/**
 * iOS Safari에서 키보드는 layout viewport를 줄이지 않는다. 그래서 h-dvh 셸은 키보드가
 * 올라와도 화면 전체 높이를 유지하고, Safari가 포커스된 입력창을 보이게 하려고 페이지를
 * 통째로 밀어 올리면서 입력창과 키보드 사이에 공백이 생긴다.
 *
 * visualViewport로 실제 가려진 높이를 계산해 --keyboard-inset 으로 노출한다.
 * 소비 측은 app-viewport-height 유틸리티나 bottom: var(--keyboard-inset) 로 이 값을 반영한다.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement

    // visualViewport 미지원 환경에서는 fallback 0px 로 남겨 두고 아무것도 하지 않는다.
    if (!viewport) return

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
      root.style.setProperty(CSS_VARIABLE, `${Math.round(inset)}px`)
    }

    sync()

    // iOS는 키보드가 뜰 때 offsetTop 이 움직이므로 resize 만으로는 부족하다. scroll 도 함께 본다.
    viewport.addEventListener("resize", sync)
    viewport.addEventListener("scroll", sync)

    return () => {
      viewport.removeEventListener("resize", sync)
      viewport.removeEventListener("scroll", sync)
      root.style.removeProperty(CSS_VARIABLE)
    }
  }, [])
}
