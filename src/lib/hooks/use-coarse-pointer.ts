"use client"

import * as React from "react"

const COARSE_POINTER_QUERY = "(pointer: coarse)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const getSnapshot = () => window.matchMedia(COARSE_POINTER_QUERY).matches

// 정적 프리렌더에는 window가 없으므로 데스크톱으로 가정하고, hydration 직후 실제 값으로 확정된다.
// 키보드가 올라오기 전에 확정되므로 실사용 영향은 없다.
const getServerSnapshot = () => false

// 터치 기기(모바일/태블릿) 여부. 가상 키보드에는 Shift+Enter가 없어서 Enter의 의미를
// 기기별로 나눠야 하는데, 그 판별에 쓴다.
function useCoarsePointer(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export { useCoarsePointer }
