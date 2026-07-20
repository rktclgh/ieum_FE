/**
 * 좌표를 소수점 4자리(약 11m)로 반올림한다.
 *
 * 화면 고정 핀 방식에서는 지도를 조금만 움직여도 중심 좌표가 계속 달라진다. 원본 좌표를
 * 그대로 React Query 키에 쓰면 팬 한 번에 캐시 엔트리가 수십 개씩 쌓인다. 주소 조회에
 * 11m 정밀도면 충분하므로 여기서 격자에 스냅해 키를 안정화한다.
 */
const COORDINATE_PRECISION = 1e4

// 경로 별칭 없이 node --test로 컴파일되는 CI 계약 테스트에서 쓰이므로 구조적 타입을 로컬에 둔다.
interface LatLng {
  lat: number
  lng: number
}

function roundCoordinateValue(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION
}

function roundCoordinate<T extends LatLng>(position: T): LatLng {
  return { lat: roundCoordinateValue(position.lat), lng: roundCoordinateValue(position.lng) }
}

/** 같은 격자 칸에 들어가면 같은 좌표로 본다. */
function isSameCoordinate(a: LatLng | null, b: LatLng | null): boolean {
  if (!a || !b) return a === b
  return (
    roundCoordinateValue(a.lat) === roundCoordinateValue(b.lat) &&
    roundCoordinateValue(a.lng) === roundCoordinateValue(b.lng)
  )
}

export { roundCoordinate, roundCoordinateValue, isSameCoordinate }
export type { LatLng }
