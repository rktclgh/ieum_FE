"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// scripts/build-icon-sprite.mjs가 굽는 스프라이트. 심볼 id 규칙(`{폴더}-{파일명}`)도 그
// 스크립트와 일치해야 한다.
const ICON_SPRITE_URL = "/icons/icons.svg"

const SPRITE_ELEMENT_ID = "icon-sprite"

// 스프라이트를 DOM에 심는 작업은 앱 전체에서 딱 한 번만 일어나야 한다(issue #470). 모듈
// 스코프 promise 하나를 모든 Icon 인스턴스가 공유해 요청·주입을 1회로 묶는다. 탭바가 루트
// 레이아웃에 상주하므로(issue #280) 앱이 뜨자마자 탭바 아이콘이 이 요청을 트리거하고, 그
// 뒤로 어떤 페이지에 진입해도 이미 준비된 상태라 아이콘이 지연 없이 그려진다.
let spritePromise: Promise<void> | null = null

// 외부 파일을 <use href="/icons/icons.svg#app-bar-close">로 직접 참조하는 방법은 Safari가
// 지원하지 않는다(flag-icon.tsx와 동일한 이유). 스프라이트를 fetch해 문서 안에 인라인으로
// 심고 같은 문서 내 참조(<use href="#app-bar-close">)로 쓴다.
function loadIconSprite(): Promise<void> {
  if (spritePromise) return spritePromise

  spritePromise = fetch(ICON_SPRITE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`icon sprite ${response.status}`)
      return response.text()
    })
    .then((markup) => {
      if (document.getElementById(SPRITE_ELEMENT_ID)) return

      const container = document.createElement("div")
      container.id = SPRITE_ELEMENT_ID
      container.setAttribute("aria-hidden", "true")
      container.innerHTML = markup
      document.body.prepend(container)
    })
    .catch((error) => {
      // 실패하면 다음 시도에서 다시 받을 수 있게 promise를 비운다. 자리는 계속 비어있는
      // placeholder로 남으므로 화면을 막지 않는다.
      spritePromise = null
      throw error
    })

  return spritePromise
}

// 스프라이트가 준비됐는지를 앱 전체가 공유한다. 한 번 준비되면 이후 마운트되는 아이콘은
// placeholder를 거치지 않고 바로 그려진다.
let spriteReady = false
const readyListeners = new Set<() => void>()

function subscribeSpriteReady(onReady: () => void) {
  if (spriteReady) return () => {}

  readyListeners.add(onReady)

  loadIconSprite()
    .then(() => {
      spriteReady = true
      readyListeners.forEach((listener) => listener())
      readyListeners.clear()
    })
    .catch(() => {})

  return () => {
    readyListeners.delete(onReady)
  }
}

function useIconSprite() {
  const [ready, setReady] = React.useState(spriteReady)

  React.useEffect(() => subscribeSpriteReady(() => setReady(true)), [])

  return ready
}

interface IconProps {
  /** 스프라이트 심볼 이름. `public/icons/{dir}/{file}.svg`는 `"{dir}/{file}"`로 쓴다. */
  name: string
  width: number
  height: number
  className?: string
}

/**
 * `public/icons/**`(국기 제외)의 SVG 아이콘을 스프라이트에서 그린다.
 *
 * next.config.ts가 `images.unoptimized: true`(정적 export)라 next/image가 소재 그대로의
 * `<img src="...svg">`를 냈다. 페이지에 새로 진입할 때마다 그 페이지의 아이콘 `<img>`가
 * 전부 새로 마운트되는데, 텍스트·레이아웃은 동기로 페인트되는 반면 `<img>`는 캐시 히트여도
 * fetch+decode가 비동기라 아이콘만 한두 프레임 늦게 떴다 — 이 컴포넌트가 고치는 문제다
 * (issue #470). `<use>` 참조는 이미 문서에 심어진 스프라이트를 텍스트처럼 동기로 그리므로
 * 이 지연이 없다.
 *
 * 스프라이트가 준비되기 전에는 같은 크기의 빈 자리만 잡아 레이아웃이 밀리지 않게 한다 — 앱
 * 세션 중 최초 1회, 아이콘이 하나라도 마운트되는 첫 순간에만 해당한다.
 */
function Icon({ name, width, height, className }: IconProps) {
  const ready = useIconSprite()

  if (!ready) {
    return (
      <span
        data-slot="icon-placeholder"
        aria-hidden
        style={{ width, height }}
        className={cn("inline-block shrink-0", className)}
      />
    )
  }

  return (
    <svg
      data-slot="icon"
      aria-hidden
      width={width}
      height={height}
      className={cn("shrink-0", className)}
    >
      <use href={`#${name.split("/").join("-")}`} />
    </svg>
  )
}

export { Icon, ICON_SPRITE_URL }
