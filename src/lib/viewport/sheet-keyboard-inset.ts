/**
 * 바텀시트를 키보드 위로 올리는 데 필요한 추가 여백 계산 — issue #458.
 *
 * 훅(`use-sheet-keyboard-inset.ts`)에서 DOM 읽기를 분리해, #431에서 실기기로 잰 값으로
 * 검산할 수 있게 한 순수 함수다. `docs/viewport-behavior.md`가 못박은 원칙(추측 상수 금지)을
 * 테스트로 고정하는 자리이기도 하다.
 */

/** `use-keyboard-inset.ts`·base-ui와 같은 문턱값. 브라우저 크롬 움직임을 키보드로 오인하지 않는다. */
export const KEYBOARD_RESIZE_THRESHOLD = 60

export interface SheetKeyboardGeometry {
  /** `documentElement.clientHeight`. ICB — 키보드가 떠도 줄지 않는 유일한 높이다. */
  layoutHeight: number
  /** `visualViewport.height`. 키보드가 뜨면 그만큼 줄어든다. */
  visualHeight: number
  /** `visualViewport.offsetTop`. 레이아웃 뷰포트 안에서 가시 밴드가 내려간 거리. */
  visualOffsetTop: number
  /** iOS가 입력을 보이게 하려고 문서를 강제 스크롤한 현재 위치. */
  documentScrollY?: number
  /** `visualViewport.scale`. 핀치 줌 중에는 계산을 포기한다. */
  scale: number
  /** 시트 Viewport 박스의 바닥 — `getBoundingClientRect().bottom`(레이아웃 뷰포트 좌표계). */
  sheetBottom: number
}

/**
 * 시트 박스 바닥이 가시 영역 바닥보다 얼마나 아래에 있는지(=키보드에 가려진 양).
 *
 * `getBoundingClientRect()`와 `visualViewport.offsetTop`이 같은 좌표계라 그대로 뺀다.
 * 뷰포트 단위도, 기기 상수도, "iOS가 얼마나 스크롤했는가"에 대한 가정도 쓰지 않는다.
 */
export function resolveSheetKeyboardInset(geometry: SheetKeyboardGeometry): number {
  const {
    layoutHeight,
    visualHeight,
    visualOffsetTop,
    documentScrollY = 0,
    scale,
    sheetBottom,
  } = geometry

  // 핀치 줌 중에는 visualViewport.height가 배율만큼 줄어 키보드가 없어도 큰 값이 나온다.
  // 전역 인셋·base-ui와 같은 정책으로 0으로 되돌린다(줌 아웃하면 다음 이벤트가 복구한다).
  if (scale !== 1) return 0

  // 키보드가 실제로 떠 있는지는 ICB 대비 가시 높이로 판정한다.
  // `innerHeight - visualHeight`는 iOS에서 둘이 같이 줄어 0이 되는 공식이라 쓰지 않는다(#431 실측).
  if (layoutHeight - visualHeight <= KEYBOARD_RESIZE_THRESHOLD) return 0

  // iOS는 포커스 직후 문서를 먼저 스크롤하고 visualViewport.offsetTop 이벤트를 다음 프레임에
  // 내보낼 수 있다. 지연된 0을 그대로 쓰면 438px처럼 키보드 높이를 이중으로 더해 시트가
  // 화면 상단으로 튄다. 둘은 같은 레이아웃 좌표계이므로 앞선 값을 사용한다.
  const visibleTop = Math.max(visualOffsetTop, documentScrollY)

  return Math.max(0, Math.round(sheetBottom - (visibleTop + visualHeight)))
}
