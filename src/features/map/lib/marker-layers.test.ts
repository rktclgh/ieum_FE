import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import {
  MARKER_LAYER_SPECS,
  MARKER_SHADOW_LAYER_ID,
  SELECTED_LOCATION_LAYER_ID,
  MARKER_ICON_LAYER_ID,
} from "./marker-layers.ts"

test("shadow 레이어가 목록의 맨 아래(첫 항목)에 온다 — 모든 마커 아래 깔려야 한다", () => {
  assert.equal(MARKER_LAYER_SPECS[0].id, MARKER_SHADOW_LAYER_ID)
})

test("선택 위치 레이어가 목록의 맨 위(마지막 항목)에 온다 — 항상 최상단에 그려져야 한다(#412)", () => {
  assert.equal(MARKER_LAYER_SPECS[MARKER_LAYER_SPECS.length - 1].id, SELECTED_LOCATION_LAYER_ID)
})

test("marker-icon 레이어는 pin 종류에만 적용되는 filter를 가진다", () => {
  const iconSpec = MARKER_LAYER_SPECS.find((spec: { id: string }) => spec.id === MARKER_ICON_LAYER_ID)
  assert.deepEqual(iconSpec?.filter, ["==", ["get", "kind"], "pin"])
})

test("레이어 id는 전부 유일하다", () => {
  const ids = MARKER_LAYER_SPECS.map((spec: { id: string }) => spec.id)
  assert.equal(new Set(ids).size, ids.length)
})
