"use client"

import { useKeyboardInset } from "@/lib/viewport/use-keyboard-inset"

/** 앱 전역에 --keyboard-inset 을 노출하기 위해 루트 레이아웃에 한 번만 마운트한다. */
export function KeyboardInsetProvider(): null {
  useKeyboardInset()
  return null
}
