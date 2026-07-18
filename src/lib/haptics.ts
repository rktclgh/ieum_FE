// 롱프레스 등 사용자 제스처에 짧은 촉각 피드백을 준다.
//
// 웹의 진동은 플랫폼별로 반쪽짜리라 두 경로를 함께 태운다.
// - Android(Chrome/삼성브라우저): Vibration API가 동작한다.
// - iOS Safari: Vibration API를 지원하지 않는다. 대신 iOS 17.4+의
//   `<input switch>` 토글이 내는 시스템 햅틱을 빌린다. 숨겨둔 스위치 input을
//   프로그램적으로 클릭해 토글하면 진동만 재생되고 화면 변화는 없다.
// 두 경로는 서로의 플랫폼에서 조용히 무시되므로 함께 호출해도 부작용이 없다.

let switchInput: HTMLInputElement | null = null

// iOS 스위치 트릭용 숨겨진 input을 최초 1회 만들어 재사용한다.
function getSwitchInput(): HTMLInputElement | null {
  if (typeof document === "undefined") return null
  if (switchInput) return switchInput

  const input = document.createElement("input")
  input.type = "checkbox"
  // switch는 표준 타입이 아닌 iOS 확장 속성이라 setAttribute로 붙인다.
  input.setAttribute("switch", "")

  // display:none 은 iOS에서 렌더 트리에서 제외되어 토글 햅틱이 트리거되지 않는다.
  // 렌더 트리에는 남기되 시각적으로만 숨긴다(opacity/absolute).
  input.setAttribute("aria-hidden", "true")
  input.tabIndex = -1
  Object.assign(input.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>)

  document.body.appendChild(input)

  switchInput = input
  return input
}

/**
 * 짧은 촉각 피드백(약 10ms 톡)을 준다.
 * 지원하지 않는 플랫폼에서는 조용히 무시된다.
 */
export function triggerHaptic(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10)
  }
  getSwitchInput()?.click()
}
