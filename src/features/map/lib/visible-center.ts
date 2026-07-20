/**
 * 헤더·하단 시트 같은 오버레이가 지도를 가릴 때, 실제로 보이는 영역의 중심을 구한다.
 *
 * 이 수식은 세 곳에서 쓰인다 — 화면 고정 핀의 좌표 읽기, 마운트 시 중심 정렬, GPS 재중심.
 * 어느 하나라도 다른 계산을 쓰면 핀이 가리키는 지점과 실제 조회되는 좌표가 어긋나므로
 * 여기 한 곳에만 둔다.
 */

interface VisibleCenterInput {
  /** 지도 컨테이너 크기(px) */
  width: number
  height: number
  /** 상단 오버레이에 가려지는 높이(px) */
  topInset?: number
  /** 하단 오버레이에 가려지는 높이(px) */
  bottomInset?: number
}

/** 보이는 영역의 중심 픽셀 좌표(컨테이너 기준). */
function resolveVisibleCenterPoint({
  width,
  height,
  topInset = 0,
  bottomInset = 0,
}: VisibleCenterInput): { x: number; y: number } {
  // 인셋 합이 컨테이너보다 크면(가려진 영역이 화면을 덮으면) 음수 높이가 나온다.
  // 그런 상태에서는 보이는 영역이 없으므로 기하 중심으로 안전하게 되돌린다.
  const visibleHeight = height - topInset - bottomInset
  if (visibleHeight <= 0) return { x: width / 2, y: height / 2 }

  return { x: width / 2, y: topInset + visibleHeight / 2 }
}

/**
 * 지도의 기하 중심 대비 보이는 영역 중심이 세로로 얼마나 아래에 있는지(px).
 * 양수면 보이는 중심이 기하 중심보다 아래.
 */
function resolveVisibleCenterOffsetY({
  width,
  height,
  topInset,
  bottomInset,
}: VisibleCenterInput): number {
  return resolveVisibleCenterPoint({ width, height, topInset, bottomInset }).y - height / 2
}

export { resolveVisibleCenterPoint, resolveVisibleCenterOffsetY }
export type { VisibleCenterInput }
