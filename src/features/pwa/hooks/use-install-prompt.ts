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
import {
  isIOSSafari,
  isStandalone,
  readIosInstallFlow,
  type IosInstallFlow,
} from "@/features/pwa/lib/platform"
import { registerServiceWorker } from "@/features/pwa/lib/register-service-worker"

function useInstallPrompt() {
  const { deferredPrompt, promptInstall } = useBeforeInstallPrompt()
  const [isOpen, setOpen] = React.useState(false)

  // 마운트 시 1회만 읽는다. 배너를 여는 순간 플래그를 쓰므로, 매 렌더 재조회하면 스스로 닫힌다.
  const [dismissedAtMount] = React.useState(() => isInstallPromptDismissed())

  // 진입 시 SW 등록(설치 가능 판정을 받기 위함). 멱등.
  // registerServiceWorker는 실패를 전파한다(푸시 경로의 fail-fast 보존). 설치 배너는
  // best-effort라 여기서 삼킨다 — 등록 실패는 배너를 못 띄울 뿐 앱 동작과 무관.
  React.useEffect(() => {
    void registerServiceWorker().catch(() => {})
  }, [])

  // 마운트 전에는 판정을 보류해 서버 프리렌더와 클라 첫 렌더를 "unavailable"로 일치시킨다.
  // 지금도 닫힌 Portal이 DOM을 만들지 않아 실제 mismatch는 없지만, 그 성질은 Base UI 내부
  // 구현(Portal이 null 반환)에 기대고 있다. 클라 전용 API(matchMedia·UA)를 렌더 중 호출하지
  // 않도록 묶어 두면 그 의존이 사라진다. home-map-screen과 같은 관용구.
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const method: InstallMethod = isMounted
    ? resolveInstallMethod({
        isStandalone: isStandalone(),
        isIOSSafari: isIOSSafari(),
        hasDeferredPrompt: deferredPrompt !== null,
        isDismissed: dismissedAtMount,
      })
    : "unavailable"

  // method와 같은 마운트 게이트 뒤에서 읽어야 하이드레이션 불일치가 없다.
  const flow: IosInstallFlow = isMounted ? readIosInstallFlow() : "unknown"

  // 노출 가능해지는 순간 열고 즉시 플래그 기록 → 무엇을 누르든 다시 안 뜸.
  React.useEffect(() => {
    if (method === "unavailable") return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true)
    markInstallPromptDismissed()
  }, [method])

  const onClose = React.useCallback(() => setOpen(false), [])
  const onInstall = React.useCallback(() => {
    void promptInstall()
    setOpen(false)
  }, [promptInstall])

  return { method, flow, isOpen, onInstall, onClose }
}

export { useInstallPrompt }
