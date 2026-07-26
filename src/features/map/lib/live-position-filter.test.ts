import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { shouldAcceptLiveFix, MAX_ACCEPTABLE_ACCURACY_METERS } from "./live-position-filter.ts"

const BASE = { lat: 37.5665, lng: 126.978 }

test("이전 좌표가 없으면(최초 fix) 정확도와 무관하게 항상 수락한다", () => {
  assert.equal(
    shouldAcceptLiveFix(null, { lat: 37.6, lng: 127.0, accuracyMeters: 999 }),
    true
  )
})

test("정확도가 임계값보다 나쁜 fix는 거부한다", () => {
  const next = { lat: BASE.lat + 0.001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS + 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), false)
})

test("정확도가 임계값 이내라도 최소 이동거리 미만이면 거부한다", () => {
  // 위도 0.00001도 ≈ 1.1m — MIN_MOVEMENT_METERS(5m)보다 작은 이동
  const next = { lat: BASE.lat + 0.00001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS - 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), false)
})

test("정확도가 좋고 최소 이동거리 이상이면 수락한다", () => {
  // 위도 0.0001도 ≈ 11m — MIN_MOVEMENT_METERS(5m) 이상
  const next = { lat: BASE.lat + 0.0001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS - 1 }
  assert.equal(shouldAcceptLiveFix(BASE, next), true)
})

test("정확도 경계값(임계값과 정확히 같음)은 수락한다", () => {
  const next = { lat: BASE.lat + 0.0001, lng: BASE.lng, accuracyMeters: MAX_ACCEPTABLE_ACCURACY_METERS }
  assert.equal(shouldAcceptLiveFix(BASE, next), true)
})
