import assert from "node:assert/strict"
import test from "node:test"

import { resolveInitialMapCenter } from "../../src/features/map/lib/initial-map-center"

const GPS = { lat: 35.1796, lng: 129.0756 }
const FALLBACK = { lat: 37.5665, lng: 126.978 }

test("GPS 조회 중에는 MapCanvas initial center를 만들지 않는다", () => {
  assert.equal(
    resolveInitialMapCenter({
      position: null,
      status: "loading",
      fallbackCenter: FALLBACK,
    }),
    null
  )
})

test("GPS 성공이면 최초 center로 GPS 좌표를 반환한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: GPS,
      status: "success",
      fallbackCenter: FALLBACK,
    }),
    GPS
  )
})

test("geolocation error와 좌표 없음에서만 fallback center를 반환한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: null,
      status: "error",
      fallbackCenter: FALLBACK,
    }),
    FALLBACK
  )
})

test("error가 뒤따라도 이미 확보한 GPS 좌표를 우선한다", () => {
  assert.deepEqual(
    resolveInitialMapCenter({
      position: GPS,
      status: "error",
      fallbackCenter: FALLBACK,
    }),
    GPS
  )
})
