const KEY = "ieum.pwa-install-dismissed"

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isInstallPromptDismissed(): boolean {
  return getStorage()?.getItem(KEY) === "1"
}

function markInstallPromptDismissed(): void {
  try {
    getStorage()?.setItem(KEY, "1")
  } catch {
    // 사파리 프라이빗 모드 등에서 QuotaExceededError가 날 수 있다.
    // 저장 실패는 배너가 다시 뜨는 정도라 무해하므로 무시한다.
  }
}

export { isInstallPromptDismissed, markInstallPromptDismissed }
