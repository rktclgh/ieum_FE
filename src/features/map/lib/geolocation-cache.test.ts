import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { GEOLOCATION_CACHE_TTL_MS, clearCachedPosition, isCachedPositionUsable, readUsablePosition, rememberPosition } from "./geolocation-cache.ts"

const SEOUL = { lat: 37.5665, lng: 126.978 }

test("캐시가 없으면 쓸 수 없다", () => {
  assert.equal(isCachedPositionUsable(null, 1_000), false)
})

test("TTL 이내의 좌표는 쓸 수 있다", () => {
  const cached = { ...SEOUL, capturedAt: 1_000 }
  assert.equal(isCachedPositionUsable(cached, 1_000), true)
  assert.equal(isCachedPositionUsable(cached, 1_000 + GEOLOCATION_CACHE_TTL_MS), true)
})

test("TTL을 넘긴 좌표는 쓰지 않는다 — 그 사이 사용자가 이동했을 수 있다", () => {
  const cached = { ...SEOUL, capturedAt: 1_000 }
  assert.equal(isCachedPositionUsable(cached, 1_001 + GEOLOCATION_CACHE_TTL_MS), false)
})

test("기기 시계가 뒤로 갔을 때(음수 나이) 쓰지 않는다", () => {
  const cached = { ...SEOUL, capturedAt: 10_000 }
  assert.equal(isCachedPositionUsable(cached, 9_999), false)
})

test("기억한 좌표를 TTL 이내에 되읽으면 capturedAt 없이 좌표만 돌려준다", () => {
  clearCachedPosition()
  rememberPosition(SEOUL, 1_000)

  assert.deepEqual(readUsablePosition(1_000), SEOUL)
})

test("기억한 좌표도 TTL을 넘기면 읽히지 않는다", () => {
  clearCachedPosition()
  rememberPosition(SEOUL, 1_000)

  assert.equal(readUsablePosition(1_001 + GEOLOCATION_CACHE_TTL_MS), null)
})

test("나중에 기억한 좌표가 이전 좌표를 덮어쓴다", () => {
  clearCachedPosition()
  rememberPosition(SEOUL, 1_000)
  rememberPosition({ lat: 35.1796, lng: 129.0756 }, 2_000)

  assert.deepEqual(readUsablePosition(2_000), { lat: 35.1796, lng: 129.0756 })
})

test("비우면 다시 읽히지 않는다", () => {
  rememberPosition(SEOUL, 1_000)
  clearCachedPosition()

  assert.equal(readUsablePosition(1_000), null)
})
