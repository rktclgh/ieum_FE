type InstallMethod = "prompt" | "ios-manual" | "unavailable"

interface InstallAvailabilityInput {
  isStandalone: boolean
  isIOSSafari: boolean
  hasDeferredPrompt: boolean
  isDismissed: boolean
}

// 우선순위: 이미 설치됨 → 1회 소진 → OS 프롬프트 → iOS 수동 안내 → 없음.
// standalone을 dismissal보다 먼저 봐 이미 설치한 사용자에겐 절대 뜨지 않게 한다.
function resolveInstallMethod(input: InstallAvailabilityInput): InstallMethod {
  if (input.isStandalone) return "unavailable"
  if (input.isDismissed) return "unavailable"
  if (input.hasDeferredPrompt) return "prompt"
  if (input.isIOSSafari) return "ios-manual"
  return "unavailable"
}

export { resolveInstallMethod }
export type { InstallMethod, InstallAvailabilityInput }
