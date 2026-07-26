import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { lerpLatLng, easeOutCubic } from "./point-interpolation.ts"

test("t=0이면 시작점을 반환한다", () => {
  const start = { lat: 37.5, lng: 127.0 }
  const end = { lat: 37.6, lng: 127.1 }
  assert.deepEqual(lerpLatLng(start, end, 0), start)
})

test("t=1이면 끝점을 반환한다", () => {
  const start = { lat: 37.5, lng: 127.0 }
  const end = { lat: 37.6, lng: 127.1 }
  assert.deepEqual(lerpLatLng(start, end, 1), end)
})

test("t=0.5면 중간 지점을 반환한다", () => {
  const start = { lat: 0, lng: 0 }
  const end = { lat: 10, lng: 20 }
  assert.deepEqual(lerpLatLng(start, end, 0.5), { lat: 5, lng: 10 })
})

test("easeOutCubic(0)은 0이다", () => {
  assert.equal(easeOutCubic(0), 0)
})

test("easeOutCubic(1)은 1이다", () => {
  assert.equal(easeOutCubic(1), 1)
})

test("easeOutCubic은 처음(0→0.5 구간)이 나중(0.5→1 구간)보다 더 많이 진행한다 (ease-out 특성)", () => {
  const firstHalf = easeOutCubic(0.5) - easeOutCubic(0)
  const secondHalf = easeOutCubic(1) - easeOutCubic(0.5)
  assert.ok(firstHalf > secondHalf, `expected first half (${firstHalf}) > second half (${secondHalf})`)
})
