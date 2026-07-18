// PWA 설치 판별용 플랫폼 감지. 서버(정적 export 프리렌더)에서는 false.
function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false
  // iOS Safari는 display-mode를 신뢰할 수 없어 navigator.standalone을 함께 본다.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return displayModeStandalone || iosStandalone
}

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+는 Mac으로 위장하므로 터치 지원으로 보정한다.
    (ua.includes("Macintosh") && "ontouchend" in document)
  // iOS의 모든 브라우저는 WebKit이라 수동 설치만 가능 → 함께 true.
  return isIOS
}

export { isStandalone, isIOSSafari }
