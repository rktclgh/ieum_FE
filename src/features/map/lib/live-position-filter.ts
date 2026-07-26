import { haversineMeters } from "@/features/map/lib/distance"
import type { LatLng } from "@/features/map/lib/coordinate-precision"

/** 이보다 오차 반경이 큰 fix는 위치 갱신에 반영하지 않는다. */
const MAX_ACCEPTABLE_ACCURACY_METERS = 30

/** 이전에 반영한 좌표에서 이 거리(m) 미만으로 움직인 fix는 갱신하지 않는다 —
 * 정지 상태에서도 발생하는 GPS 자연 흔들림을 걸러낸다. */
const MIN_MOVEMENT_METERS = 5

interface LiveFix extends LatLng {
  accuracyMeters: number
}

/**
 * watchPosition의 새 fix를 위치 상태에 반영할지 결정한다.
 * 최초 fix(previous가 없을 때)는 정확도와 무관하게 항상 반영한다 — 그렇지 않으면
 * 신호가 나쁜 곳(실내 등)에서 최초 위치를 영영 못 받아 로딩에서 벗어나지 못한다.
 */
function shouldAcceptLiveFix(previous: LatLng | null, next: LiveFix): boolean {
  if (!previous) return true
  if (next.accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) return false
  return haversineMeters(previous, next) >= MIN_MOVEMENT_METERS
}

export { shouldAcceptLiveFix, MAX_ACCEPTABLE_ACCURACY_METERS, MIN_MOVEMENT_METERS }
export type { LiveFix }
