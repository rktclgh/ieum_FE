interface CachedCoordinates {
  lat: number
  lng: number
}

interface CachedPosition extends CachedCoordinates {
  capturedAt: number
}

// 캐시 좌표를 그대로 지도 초기 중심으로 쓸 수 있는 유효 시간(ms).
// 이보다 오래되면 그 사이 사용자가 이동했을 수 있어, 캐시를 버리고 다시 측위를 기다린다.
const GEOLOCATION_CACHE_TTL_MS = 5 * 60_000

function isCachedPositionUsable(
  cached: CachedPosition | null,
  now: number,
  ttlMs: number = GEOLOCATION_CACHE_TTL_MS
): boolean {
  if (!cached) return false

  // 기기 시계가 뒤로 간 경우(age < 0) 나이를 신뢰할 수 없으므로 쓰지 않는다.
  const age = now - cached.capturedAt
  return age >= 0 && age <= ttlMs
}

// 탭 이동(마이 → 홈)은 같은 문서 안의 클라이언트 내비게이션이라 이 모듈이 그대로 살아 있다.
// 그래서 sessionStorage 대신 모듈 스코프에 담는다 — 직렬화 비용도, 파싱 실패 처리도 필요 없다.
// 훅이 재마운트될 때 이 값으로 즉시 복원해, 매번 GPS 재측위를 기다리지 않게 한다.
//
// 불변식: 이 캐시는 측위 성공 콜백에서만 채운다. 모듈 로드 시점(예: localStorage 복원)에
// 채우면 안 된다 — useGeolocation이 렌더 중에 읽어 초기 상태를 정하므로, hydration 렌더에서
// 서버(항상 비어 있음)와 값이 달라져 불일치가 난다. 굳이 새로고침 너머로 살리려면 캐시 읽기를
// useSyncExternalStore(getServerSnapshot=null)로 옮긴 뒤에 해야 한다.
let cachedPosition: CachedPosition | null = null

function rememberPosition(position: CachedCoordinates, capturedAt: number): void {
  cachedPosition = { lat: position.lat, lng: position.lng, capturedAt }
}

function readUsablePosition(now: number): CachedCoordinates | null {
  if (!isCachedPositionUsable(cachedPosition, now)) return null
  // cachedPosition은 위 검사에서 non-null이 보장된다.
  return { lat: cachedPosition!.lat, lng: cachedPosition!.lng }
}

// 테스트가 모듈 상태를 격리하기 위해 쓴다.
function clearCachedPosition(): void {
  cachedPosition = null
}

export {
  GEOLOCATION_CACHE_TTL_MS,
  clearCachedPosition,
  isCachedPositionUsable,
  readUsablePosition,
  rememberPosition,
}
export type { CachedCoordinates, CachedPosition }
