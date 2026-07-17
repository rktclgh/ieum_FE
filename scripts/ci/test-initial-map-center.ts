import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveInitialMapCenter,
  resolvePlaceSelectionTarget,
} from "../../src/features/map/lib/initial-map-center"
import { resolveInitialGeolocationStatus } from "../../src/features/map/lib/geolocation-initial-status"

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

test("timeout 뒤 GPS success는 서울 fallback 없이 GPS 좌표로 최초 center를 만든다", () => {
  const afterTimeout = resolveInitialGeolocationStatus("loading", {
    type: "error",
    errorCode: 3,
  })
  const afterSuccess = resolveInitialGeolocationStatus(afterTimeout, { type: "success" })

  assert.deepEqual(
    resolveInitialMapCenter({
      position: GPS,
      status: afterSuccess,
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

test("fallback이 고정된 뒤 늦게 도착한 GPS는 보이지 않는 장소 입력 대상으로 쓰지 않는다", () => {
  assert.equal(
    resolvePlaceSelectionTarget({
      clicked: null,
      position: GPS,
      isFallbackLocked: true,
    }),
    null
  )
})

test("fallback이 고정돼도 사용자가 지도에서 고른 좌표는 장소 입력 대상으로 쓴다", () => {
  const clicked = { lat: 37.4563, lng: 126.7052 }

  assert.deepEqual(
    resolvePlaceSelectionTarget({
      clicked,
      position: GPS,
      isFallbackLocked: true,
    }),
    clicked
  )
})

test("사용자가 GPS 재중심을 명시하면 늦게 도착한 좌표를 다시 장소 입력 대상으로 쓴다", () => {
  assert.deepEqual(
    resolvePlaceSelectionTarget({
      clicked: null,
      position: GPS,
      isFallbackLocked: false,
    }),
    GPS
  )
})
