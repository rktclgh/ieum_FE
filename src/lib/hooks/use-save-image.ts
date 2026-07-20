"use client"

import * as React from "react"

import { saveImage } from "@/lib/files/save-image"

const FAILURE_DISMISS_MS = 2000

/**
 * 사진 저장 실행과 실패 배너 상태를 한곳에 모은다.
 * 성공은 공유시트·브라우저 다운로드 UI 가 이미 피드백을 주므로 따로 알리지 않는다.
 */
function useSaveImage() {
  const [failed, setFailed] = React.useState(false)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const dismissFailed = React.useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setFailed(false)
  }, [])

  const save = React.useCallback(async (url: string) => {
    const result = await saveImage(url)
    // "cancelled" 는 사용자가 공유시트를 닫은 것이므로 실패로 취급하지 않는다.
    if (result !== "failed") return
    setFailed(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setFailed(false)
    }, FAILURE_DISMISS_MS)
  }, [])

  return { save, failed, dismissFailed }
}

export { useSaveImage }
