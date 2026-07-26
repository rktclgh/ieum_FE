import type { LatLng } from "./coordinate-precision"

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function lerpLatLng(start: LatLng, end: LatLng, t: number): LatLng {
  return { lat: lerp(start.lat, end.lat, t), lng: lerp(start.lng, end.lng, t) }
}

// 전역 모션 표준(`--ease-base: cubic-bezier(0.32, 0.72, 0, 1)`, app/globals.css)이 CSS 전용이라
// GL 포인트 좌표 보간(rAF 루프) 안에서는 쓸 수 없다. 같은 "빠르게 시작해 부드럽게 멈추는"
// ease-out 특성을 갖는 3차 함수로 근사한다.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export { lerpLatLng, easeOutCubic }
