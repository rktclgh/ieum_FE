"use client"

import { useEffect } from "react"

const CSS_VARIABLE = "--keyboard-inset"

// iOS Safari가 URL/탭 바를 접거나 펼치는 도중에도 innerHeight - visualViewport.height 가
// 수십 px 단위로 흔들린다. 이 문턱값보다 작은 변화는 키보드가 아니라 브라우저 크롬 움직임으로
// 보고 0으로 취급한다. @base-ui/react의 Drawer.VirtualKeyboardProvider가 쓰는
// KEYBOARD_RESIZE_THRESHOLD와 값을 맞춰, 같은 화면에서 공존하는 두 구현이 "키보드가 떠 있다"는
// 판단 기준을 어긋나지 않게 한다.
const KEYBOARD_RESIZE_THRESHOLD = 60

/**
 * iOS Safari에서 키보드는 layout viewport를 줄이지 않는다. 그래서 h-dvh 셸은 키보드가
 * 올라와도 화면 전체 높이를 유지하고, Safari가 포커스된 입력창을 보이게 하려고 페이지를
 * 통째로 밀어 올리면서 입력창과 키보드 사이에 공백이 생긴다.
 *
 * visualViewport로 실제 가려진 높이를 계산해 --keyboard-inset 으로 노출한다.
 * 소비 측은 `Screen kind="fixed"`(pb-[var(--keyboard-inset)]) 나 각 하단 고정 바의
 * pb-[...] 에서 이 값을 반영한다(issue #419).
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

      // offsetTop을 더하기 전, 순수 높이 감소분으로 먼저 "키보드가 맞는지"를 판단한다.
      // 문턱값 이하면 브라우저 크롬 움직임으로 보고 0을 퍼블리시한다 — Screen kind="fixed"의
      // 100dvh가 이미 크롬 상태를 반영하므로, 여기서까지 빼면 이중으로 줄어든다.
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
