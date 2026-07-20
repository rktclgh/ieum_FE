"use client"

import * as React from "react"

import { triggerHaptic } from "@/lib/haptics"

interface UseLongPressOptions {
  onLongPress: () => void
  delay?: number
}

// 롱프레스 후 이어지는 click까지 발생해 메뉴가 열리자마자 눌린 항목으로 이동하는 것을 막기 위해
// triggeredRef로 직전 클릭을 한 번 흡수한다.
function useLongPress({ onLongPress, delay = 500 }: UseLongPressOptions) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const triggeredRef = React.useRef(false)

  const start = React.useCallback(() => {
    triggeredRef.current = false
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true
      triggerHaptic()
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const clear = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      onLongPress()
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (triggeredRef.current) {
        event.preventDefault()
        event.stopPropagation()
        // 딱 한 번만 흡수한다. 롱프레스 후 포인터를 요소 밖에서 떼면 click 이 오지 않아
        // 플래그가 남는데, 그 상태로 키보드(Enter/Space)로 활성화하면 pointerdown 없이
        // click 만 와서 정상 입력까지 삼켜버린다.
        triggeredRef.current = false
      }
    },
  }
}

export { useLongPress }
