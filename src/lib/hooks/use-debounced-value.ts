"use client"

import * as React from "react"

// 값이 delay 동안 안정될 때까지 갱신을 미룬다. 검색 입력은 매 키스트로크 반영하되
// 서버 요청만 코얼레싱하는 용도(IME 가드는 두지 않는다).
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeoutId)
  }, [value, delay])

  return debounced
}

export { useDebouncedValue }
