"use client"

import * as React from "react"

import { useBeforeInstallPrompt } from "@/features/pwa/hooks/use-before-install-prompt"
import {
  isInstallPromptDismissed,
  markInstallPromptDismissed,
} from "@/features/pwa/lib/install-dismissal-storage"
import {
  resolveInstallMethod,
  type InstallMethod,
} from "@/features/pwa/lib/install-availability"
import { isIOSSafari, isStandalone } from "@/features/pwa/lib/platform"
import { registerServiceWorker } from "@/features/pwa/lib/register-service-worker"

function useInstallPrompt() {
  const { deferredPrompt, promptInstall } = useBeforeInstallPrompt()
  const [isOpen, setOpen] = React.useState(false)

  // dismissal 플래그는 마운트 시 한 번만 읽는다(노출 직후 기록한 값을 스스로 읽고 닫는 것을 방지).
  const dismissedRef = React.useRef<boolean | null>(null)
  if (dismissedRef.current === null) dismissedRef.current = isInstallPromptDismissed()

  // 진입 시 SW 등록(설치 가능 판정을 받기 위함). 멱등.
  // registerServiceWorker는 실패를 전파한다(푸시 경로의 fail-fast 보존). 설치 배너는
  // best-effort라 여기서 삼킨다 — 등록 실패는 배너를 못 띄울 뿐 앱 동작과 무관.
  React.useEffect(() => {
    void registerServiceWorker().catch(() => {})
  }, [])

  const method: InstallMethod = resolveInstallMethod({
    isStandalone: isStandalone(),
    isIOSSafari: isIOSSafari(),
    hasDeferredPrompt: deferredPrompt !== null,
    isDismissed: dismissedRef.current ?? false,
  })

  // 노출 가능해지는 순간 열고 즉시 플래그 기록 → 무엇을 누르든 다시 안 뜸.
  React.useEffect(() => {
    if (method === "unavailable") return
    setOpen(true)
    markInstallPromptDismissed()
  }, [method])

  const onClose = React.useCallback(() => setOpen(false), [])
  const onInstall = React.useCallback(() => {
    void promptInstall()
    setOpen(false)
  }, [promptInstall])

  return { method, isOpen, onInstall, onClose }
}

export { useInstallPrompt }
