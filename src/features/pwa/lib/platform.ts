// PWA 설치 판별용 플랫폼 감지. 서버(정적 export 프리렌더)에서는 false.
function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false
  // iOS Safari는 display-mode를 신뢰할 수 없어 navigator.standalone을 함께 본다.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return displayModeStandalone || iosStandalone
}

// 카카오톡/인스타그램 등 인앱 웹뷰는 공유시트에 "홈 화면에 추가"가 없어
// iOS 수동 설치 안내를 보여줄 수 없다 (그리고 1회성 dismissal 플래그만 소진시킨다).
const IN_APP_BROWSER_MARKERS = ["KAKAOTALK", "Instagram", "FBAN", "FBAV", "Line/", "NAVER", "DaumApps"]

function isIOSUserAgent(userAgent: string, hasTouch: boolean): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) ||
    // iPadOS 13+는 Mac으로 위장하므로 터치 지원으로 보정한다.
    (userAgent.includes("Macintosh") && hasTouch)
}

function isInAppBrowserUserAgent(userAgent: string): boolean {
  const lowered = userAgent.toLowerCase()
  return IN_APP_BROWSER_MARKERS.some((marker) => lowered.includes(marker.toLowerCase()))
}

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const hasTouch = "ontouchend" in document
  // iOS의 모든 브라우저는 WebKit이라 수동 설치만 가능하지만, 인앱 웹뷰는 제외한다.
  return isIOSUserAgent(ua, hasTouch) && !isInAppBrowserUserAgent(ua)
}

// iOS 26에서 Safari 하단 바가 바뀌었다. 공유 버튼이 바에서 빠지고 원형 더보기(⋯)
// 메뉴 안으로 들어가, 그 이전 버전과 설치 경로의 첫 단계가 다르다.
type IosInstallFlow = "modern" | "legacy" | "unknown"

const IOS_MODERN_BAR_MAJOR = 26

// iPhone은 "CPU iPhone OS 26_0", iPad는 "CPU OS 18_0" 형태로 버전을 싣는다.
// iPadOS 데스크톱 모드(Macintosh 위장)는 버전을 싣지 않아 매치되지 않는다.
function detectIosInstallFlow(userAgent: string): IosInstallFlow {
  const match = /(?:iPhone|CPU) OS (\d+)_/.exec(userAgent)
  if (match === null) return "unknown"
  return Number(match[1]) >= IOS_MODERN_BAR_MAJOR ? "modern" : "legacy"
}

function readIosInstallFlow(): IosInstallFlow {
  if (typeof window === "undefined") return "unknown"
  return detectIosInstallFlow(window.navigator.userAgent)
}

export {
  isStandalone,
  isIOSSafari,
  isIOSUserAgent,
  isInAppBrowserUserAgent,
  detectIosInstallFlow,
  readIosInstallFlow,
}
export type { IosInstallFlow }
