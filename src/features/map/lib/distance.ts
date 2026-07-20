// 경로 별칭 없이 node --test로 컴파일되는 CI 계약 테스트에서 쓰이므로 상대 경로만 사용한다.
import type { LatLng } from "./coordinate-precision"

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

// near가 없으면(위치 미확보) 정렬하지 않고 원본 순서를 유지한다.
// 어느 경로로든 새 배열을 반환한다 — 입력이 React Query 캐시 배열이라 제자리 변형이 캐시를 오염시킨다.
function sortByDistance<T extends { location: LatLng }>(items: T[], near: LatLng | null): T[] {
  if (!near) return [...items]
  // 비교마다 삼각함수를 다시 돌리지 않도록 거리를 한 번씩만 계산해 두고 정렬한다.
  return items
    .map((item) => ({ item, distance: haversineMeters(near, item.location) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ item }) => item)
}

export { haversineMeters, sortByDistance }
