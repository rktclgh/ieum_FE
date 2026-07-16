import assert from "node:assert/strict"
import test from "node:test"

import {
  isInitialGeolocationFailure,
  resolveInitialGeolocationStatus,
} from "../../src/features/map/lib/geolocation-initial-status"

test("권한 거부만 최초 GPS fallback으로 확정한다", () => {
  assert.equal(isInitialGeolocationFailure(1), true)
  assert.equal(isInitialGeolocationFailure(2), false)
  assert.equal(isInitialGeolocationFailure(3), false)
})

test("timeout 뒤 GPS success는 picker의 최초 지도 중심을 계속 기다리게 한다", () => {
  const afterTimeout = resolveInitialGeolocationStatus("loading", {
    type: "error",
    errorCode: 3,
  })
  const afterSuccess = resolveInitialGeolocationStatus(afterTimeout, { type: "success" })

  assert.equal(afterTimeout, "loading")
  assert.equal(afterSuccess, "success")
})
