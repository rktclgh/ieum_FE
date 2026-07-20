import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { isTransientTileRequestError } from "./map-tile-error.ts"

// MapLibre가 실제로 던지는 AJAXError의 형태를 그대로 흉내낸다.
// (maplibre-gl은 브라우저 전용이라 node 테스트에서 import하지 않고 구조만 재현한다.)
function createAjaxError(status: number, statusText: string) {
  const error = new Error(`AJAXError: ${statusText} (${status}): https://tiles.example.org/1/2/3.pbf`)
  return Object.assign(error, {
    status,
    statusText,
    url: "https://tiles.example.org/1/2/3.pbf",
    body: new Blob([]),
  })
}

test("줌 전환 중 취소된 타일 요청(status 0)은 노이즈로 판정한다", () => {
  assert.equal(isTransientTileRequestError(createAjaxError(0, "Failed to fetch")), true)
})

test("서버가 실제 상태 코드로 응답한 실패는 노이즈가 아니다", () => {
  assert.equal(isTransientTileRequestError(createAjaxError(404, "Not Found")), false)
  assert.equal(isTransientTileRequestError(createAjaxError(429, "Too Many Requests")), false)
  assert.equal(isTransientTileRequestError(createAjaxError(500, "Internal Server Error")), false)
})

test("status가 0이어도 요청 URL이 없으면 타일 요청 실패로 보지 않는다", () => {
  const error = Object.assign(new Error("something else"), { status: 0 })
  assert.equal(isTransientTileRequestError(error), false)
})

test("AJAXError가 아닌 일반 에러는 노이즈가 아니다", () => {
  assert.equal(isTransientTileRequestError(new Error("스타일 파싱 실패")), false)
  assert.equal(isTransientTileRequestError(new TypeError("layer type mismatch")), false)
})

test("에러가 아닌 값에도 안전하게 false를 반환한다", () => {
  assert.equal(isTransientTileRequestError(undefined), false)
  assert.equal(isTransientTileRequestError(null), false)
  assert.equal(isTransientTileRequestError("status 0"), false)
  assert.equal(isTransientTileRequestError({ status: 0, url: "https://tiles.example.org" }), false)
})
