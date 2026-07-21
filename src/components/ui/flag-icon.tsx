"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// scripts/build-flag-sprite.mjs가 굽는 스프라이트. 심볼 접두사도 그 스크립트와 일치해야 한다.
const FLAG_SPRITE_URL = "/icons/flag/flags.svg"
const FLAG_SYMBOL_PREFIX = "flag-"

const SPRITE_ELEMENT_ID = "flag-sprite"

// 스프라이트를 DOM에 심는 작업은 앱 전체에서 딱 한 번만 일어나야 한다. 국적 목록은 국기를
// 199개 동시에 그리므로, 컴포넌트마다 fetch하면 그 자체로 199 요청이 되어 원래 문제로 돌아간다.
// 모듈 스코프 promise 하나를 모든 인스턴스가 공유해 요청·주입을 1회로 묶는다.
let spritePromise: Promise<void> | null = null

// 외부 파일을 <use href="/icons/flag/flags.svg#flag-kr">로 직접 참조하는 방법은 Safari가
// 지원하지 않는다. 그래서 스프라이트를 fetch해 문서 안에 인라인으로 심고 같은 문서 내
// 참조(<use href="#flag-kr">)로 쓴다.
function loadFlagSprite(): Promise<void> {
  if (spritePromise) return spritePromise

  spritePromise = fetch(FLAG_SPRITE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`flag sprite ${response.status}`)
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
      // 실패하면 다음 시도에서 다시 받을 수 있게 promise를 비운다. 국기는 장식이라
      // 못 받아도 국가 이름으로 선택은 그대로 되므로 화면을 막지 않는다.
      spritePromise = null
      throw error
    })

  return spritePromise
}

// 스프라이트가 준비됐는지를 앱 전체가 공유한다. 한 번 준비되면 이후 마운트되는 국기는
// 플레이스홀더를 거치지 않고 바로 그려진다.
let spriteReady = false
const readyListeners = new Set<() => void>()

function subscribeSpriteReady(onReady: () => void) {
  if (spriteReady) return () => {}

  readyListeners.add(onReady)

  loadFlagSprite()
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

function useFlagSprite() {
  const [ready, setReady] = React.useState(spriteReady)

  React.useEffect(() => subscribeSpriteReady(() => setReady(true)), [])

  return ready
}

interface FlagIconProps {
  code: string
  className?: string
}

/**
 * 국가 코드로 국기를 그린다. 스프라이트가 준비되기 전에는 같은 크기의 회색 자리를 잡아두어
 * 목록이 밀리지 않게 하고, 준비되는 순간 모든 국기가 한꺼번에 나타난다.
 */
function FlagIcon({ code, className }: FlagIconProps) {
  const ready = useFlagSprite()

  const shared = cn("h-[17px] w-6 shrink-0 rounded-[3px] border border-gray-100", className)

  if (!ready) {
    return <span data-slot="flag-icon-placeholder" aria-hidden className={cn(shared, "bg-gray-50")} />
  }

  return (
    <svg
      data-slot="flag-icon"
      aria-hidden
      className={shared}
      viewBox="0 0 21 15"
      // object-fit은 인라인 <svg>에 적용되지 않는다(교체 요소가 아니다). 기존 next/image의
      // object-cover와 같은 결과를 내려면 preserveAspectRatio의 slice를 써야 한다.
      preserveAspectRatio="xMidYMid slice"
    >
      <use href={`#${FLAG_SYMBOL_PREFIX}${code}`} />
    </svg>
  )
}

export { FlagIcon, FLAG_SPRITE_URL, FLAG_SYMBOL_PREFIX }
