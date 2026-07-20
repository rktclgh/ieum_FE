import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { haversineMeters, sortByDistance } from "./distance.ts"

test("같은 좌표 간 거리는 0이다", () => {
  const point = { lat: 37.5665, lng: 126.978 }
  assert.equal(haversineMeters(point, point), 0)
})

test("적도에서 경도 1도 차이는 약 111.32km다", () => {
  const distance = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
  assert.ok(Math.abs(distance - 111_320) < 500, `expected ~111320m, got ${distance}`)
})

test("가까운 순으로 정렬한다", () => {
  const near = { lat: 0, lng: 0 }
  const far = { location: { lat: 0, lng: 3 } }
  const mid = { location: { lat: 0, lng: 2 } }
  const close = { location: { lat: 0, lng: 1 } }
  assert.deepEqual(sortByDistance([far, close, mid], near), [close, mid, far])
})

test("near가 없으면 원본 순서를 유지한다", () => {
  const items = [{ location: { lat: 0, lng: 3 } }, { location: { lat: 0, lng: 1 } }]
  assert.deepEqual(sortByDistance(items, null), items)
})

test("정렬하지 않는 경로에서도 새 배열을 반환한다", () => {
  const items = [{ location: { lat: 0, lng: 3 } }]
  assert.notEqual(sortByDistance(items, null), items)
})

test("원본 배열을 변형하지 않는다", () => {
  const near = { lat: 0, lng: 0 }
  const items = [{ location: { lat: 0, lng: 2 } }, { location: { lat: 0, lng: 1 } }]
  const original = [...items]
  sortByDistance(items, near)
  assert.deepEqual(items, original)
})
