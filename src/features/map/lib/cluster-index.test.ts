import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { createPinClusterIndex, getCoincidentClusterPins, getPinClusters } from "./cluster-index.ts"

// 서울시청 부근. 겹침 판정은 좌표만 보므로 나머지 필드는 최소로 채운다.
function makePin(pinId: number, lat: number, lng: number) {
  return {
    pinId,
    pinType: "meeting" as const,
    targetId: pinId,
    title: `pin-${pinId}`,
    thumbnailUrl: null,
    location: { lat, lng },
    mine: false,
    createdAt: "2026-07-20T00:00:00Z",
  }
}

const WORLD = { swLat: -90, swLng: -180, neLat: 90, neLng: 180 }

// supercluster가 손을 떼는 배율(CLUSTER_MAX_ZOOM=17 초과) — 여기서도 겹침은 묶여야 한다.
const UNCLUSTERED_ZOOM = 18

test("좌표가 같은 핀들은 클러스터링이 꺼지는 배율에서도 하나의 더미로 묶인다", () => {
  const index = createPinClusterIndex([
    makePin(1, 37.5665, 126.978),
    makePin(2, 37.5665, 126.978),
    makePin(3, 37.5665, 126.978),
  ])

  const items = getPinClusters(index, WORLD, UNCLUSTERED_ZOOM)

  assert.equal(items.length, 1)
  assert.equal(items[0].kind, "stack")
  assert.deepEqual(
    items[0].pins.map((pin: { pinId: number }) => pin.pinId),
    [1, 2, 3]
  )
})

test("좌표가 다른 핀은 묶이지 않고 개별 핀으로 남는다", () => {
  const index = createPinClusterIndex([
    makePin(1, 37.5665, 126.978),
    makePin(2, 37.57, 126.99),
  ])

  const items = getPinClusters(index, WORLD, UNCLUSTERED_ZOOM)

  assert.equal(items.length, 2)
  assert.ok(items.every((item: { kind: string }) => item.kind === "pin"))
})

test("겹친 더미와 개별 핀이 섞여 있으면 각각 따로 나온다", () => {
  const index = createPinClusterIndex([
    makePin(1, 37.5665, 126.978),
    makePin(2, 37.5665, 126.978),
    makePin(3, 37.57, 126.99),
  ])

  const items = getPinClusters(index, WORLD, UNCLUSTERED_ZOOM)
  const kinds = items.map((item: { kind: string }) => item.kind).sort()

  assert.deepEqual(kinds, ["pin", "stack"])
})

test("클러스터에 묶인 핀이 전부 같은 좌표면 그 핀 목록을 준다(확대 대신 캐러셀)", () => {
  const pins = [makePin(1, 37.5665, 126.978), makePin(2, 37.5665, 126.978)]
  const index = createPinClusterIndex(pins)

  // 낮은 배율에서는 supercluster가 하나의 클러스터로 묶는다.
  const items = getPinClusters(index, WORLD, 10)
  assert.equal(items.length, 1)
  assert.equal(items[0].kind, "cluster")

  const coincident = getCoincidentClusterPins(index, items[0].clusterId)
  assert.deepEqual(
    coincident?.map((pin: { pinId: number }) => pin.pinId).sort(),
    [1, 2]
  )
})

test("클러스터에 흩어진 핀이 섞여 있으면 null — 기존대로 확대해야 한다", () => {
  const index = createPinClusterIndex([
    makePin(1, 37.5665, 126.978),
    makePin(2, 37.567, 126.9785),
  ])

  const items = getPinClusters(index, WORLD, 10)
  assert.equal(items[0].kind, "cluster")
  assert.equal(getCoincidentClusterPins(index, items[0].clusterId), null)
})
