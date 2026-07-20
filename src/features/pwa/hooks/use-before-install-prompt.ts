"use client"

import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function useBeforeInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)

  React.useEffect(() => {
    const handler = (event: Event) => {
      // 브라우저 기본 미니 인포바를 막고 이벤트를 보관해 우리가 원할 때 prompt()한다.
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const promptInstall = React.useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return { deferredPrompt, promptInstall }
}

export { useBeforeInstallPrompt }
export type { BeforeInstallPromptEvent }
