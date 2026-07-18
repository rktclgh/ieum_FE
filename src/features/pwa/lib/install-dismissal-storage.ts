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
  getStorage()?.setItem(KEY, "1")
}

export { isInstallPromptDismissed, markInstallPromptDismissed }
