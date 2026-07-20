"use client"

import * as React from "react"

// 재정렬 트윈 길이. 오버레이(bottom-sheet/drawer)와 같은 300ms 기준을 따른다.
const REORDER_DURATION_MS = 300
const REORDER_EASING = "cubic-bezier(0.32, 0.72, 0, 1)"

function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function measure(container: HTMLElement) {
  const positions = new Map<string, number>()
  for (const child of container.querySelectorAll<HTMLElement>("[data-flip-key]")) {
    const key = child.dataset.flipKey
    if (key !== undefined) positions.set(key, child.getBoundingClientRect().top)
  }
  return positions
}

/**
 * FLIP 재정렬 애니메이션. 컨테이너 안에서 `data-flip-key`를 가진 자식들의 세로 위치를
 * 렌더 사이에 비교해, 자리가 바뀐 항목만 이전 위치에서 새 위치로 트윈한다.
 *
 * 레이아웃은 이미 확정된 뒤 transform만 되감으므로 리플로우를 유발하지 않고,
 * `getBoundingClientRect`를 paint 전(useLayoutEffect)에 읽어 깜빡임이 없다.
 * 새로 나타나거나 사라지는 항목은 대상이 아니다(이전 위치가 없으면 건너뜀).
 */
function useFlipReorder(
  containerRef: React.RefObject<HTMLElement | null>,
  orderKey: string,
  membershipKey: string
) {
  const previousPositionsRef = React.useRef<Map<string, number> | null>(null)
  const previousOrderKeyRef = React.useRef<string | null>(null)

  // 위치는 목록 구성이나 순서가 바뀔 때만 다시 잰다(getBoundingClientRect는 리플로우를
  // 강제하므로 검색 타이핑처럼 결과가 그대로인 리렌더에서는 건너뛴다). 구성만 바뀐
  // 경우엔 기준점만 갱신하고, 실제 트윈은 orderKey가 바뀐 렌더에서만 돌린다.
  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previous = previousPositionsRef.current
    const previousOrderKey = previousOrderKeyRef.current
    const current = measure(container)
    previousPositionsRef.current = current
    previousOrderKeyRef.current = orderKey

    const orderChanged = previousOrderKey !== null && previousOrderKey !== orderKey
    if (previous === null || !orderChanged || prefersReducedMotion()) return

    for (const child of container.querySelectorAll<HTMLElement>("[data-flip-key]")) {
      const key = child.dataset.flipKey
      if (key === undefined) continue

      const from = previous.get(key)
      const to = current.get(key)
      if (from === undefined || to === undefined) continue

      const delta = from - to
      if (delta === 0) continue

      child.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
        { duration: REORDER_DURATION_MS, easing: REORDER_EASING }
      )
    }
  }, [containerRef, orderKey, membershipKey])
}

export { useFlipReorder }
