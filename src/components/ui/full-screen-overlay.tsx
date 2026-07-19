"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * transitionend가 끝내 오지 않는 경우(백그라운드 탭, 인터럽트된 트랜지션,
 * prefers-reduced-motion으로 transition이 꺼진 경우)를 위한 안전망.
 * 실제 모션(duration-base)보다 넉넉히 길게 잡아 정상 경로를 방해하지 않는다.
 */
const TRANSITION_FALLBACK_MS = 600

/**
 * closed       — 렌더하지 않음
 * enter-start  — 마운트만 하고 아직 화면 아래(translate-y-full). 이 상태가 한 번 페인트돼야 트랜지션이 걸린다
 * enter-active — 위로 올라오는 중(translate-y-0)
 * open         — 진입 완료. transform 자체를 걷어내 자식의 position:fixed가 뷰포트 기준을 되찾는다
 * exiting      — 아래로 내려가는 중. 끝나면 closed
 */
type OverlayPhase = "closed" | "enter-start" | "enter-active" | "open" | "exiting"

/** 모션이 꺼져 있으면 transitionend가 오지 않으므로 안전망을 즉시 발동시킨다. */
function fallbackDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : TRANSITION_FALLBACK_MS
}

interface FullScreenOverlayProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** 열림 여부. false가 되면 퇴장 모션이 끝난 뒤에 자식이 언마운트된다. */
  open: boolean
  children?: React.ReactNode
}

/**
 * 화면 전체를 덮는 오버레이의 마운트/모션을 맡는 프리미티브.
 * BottomSheet·Drawer와 같은 제스처(아래에서 올라옴)로 등장하고, 퇴장 모션이 끝난 뒤에 언마운트한다.
 *
 * 레이아웃은 전적으로 호출부의 className이 정한다(z-index·배경·폭·flex 등).
 * 이 프리미티브는 `fixed inset-0`과 transform 모션, 그리고 마운트 수명만 책임진다.
 */
function FullScreenOverlay({ open, className, children, ...props }: FullScreenOverlayProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null)
  const [phase, setPhase] = React.useState<OverlayPhase>(open ? "enter-start" : "closed")

  // open 프롭 변화를 phase로 옮긴다(렌더 중 파생 상태 갱신 — effect를 거치면 시작 스타일이 한 프레임 늦는다).
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    setPhase(open ? "enter-start" : "exiting")
  }

  // 닫히는 동안 부모가 넘기는 props는 대개 비워진다(예: editId → null, imageSrc → null).
  // 퇴장 모션 중에 자식이 빈 값으로 다시 그려지지 않도록 마지막 열림 상태의 children을 붙잡아 둔다.
  const [renderedChildren, setRenderedChildren] = React.useState(children)
  if (open && renderedChildren !== children) {
    setRenderedChildren(children)
  }

  // 시작 스타일이 한 프레임 페인트된 뒤에 활성 상태로 넘겨야 트랜지션이 실제로 걸린다.
  React.useEffect(() => {
    if (phase !== "enter-start") return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase("enter-active"))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [phase])

  // 진입이 끝나면 transform을 걷어내고(open), 퇴장이 끝나면 언마운트한다(closed).
  React.useEffect(() => {
    if (phase !== "enter-active" && phase !== "exiting") return

    const node = nodeRef.current
    const nextPhase: OverlayPhase = phase === "enter-active" ? "open" : "closed"
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      setPhase(nextPhase)
    }
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === node && event.propertyName === "transform") settle()
    }

    node?.addEventListener("transitionend", handleTransitionEnd)
    const timer = window.setTimeout(settle, fallbackDelay())
    return () => {
      node?.removeEventListener("transitionend", handleTransitionEnd)
      window.clearTimeout(timer)
    }
  }, [phase])

  if (phase === "closed") return null

  const isLeaving = phase === "exiting"

  return (
    <div
      ref={nodeRef}
      data-slot="full-screen-overlay"
      data-phase={phase}
      // 퇴장 중에는 포커스·스크린리더·포인터에서 완전히 격리한다.
      inert={isLeaving}
      aria-hidden={isLeaving || undefined}
      className={cn(
        "fixed inset-0 transition-transform duration-base ease-base motion-reduce:transition-none",
        // "open" 단계에서는 transform 유틸리티를 아예 붙이지 않는다.
        // translate-y-0라도 transform이 남으면 자식의 position:fixed 기준이 이 요소로 바뀐다.
        (phase === "enter-start" || isLeaving) && "translate-y-full",
        phase === "enter-active" && "translate-y-0",
        className
      )}
      {...props}
    >
      {renderedChildren}
    </div>
  )
}

export { FullScreenOverlay }
