import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildMarkerFeatureCollection, formatCount } from "./marker-geojson.ts"

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

test("pin 항목은 iconId를 resolveIconId 결과로 채운 Point feature가 된다", () => {
  const pin = makePin(1, 37.5, 127.0)
  const collection = buildMarkerFeatureCollection(
    [{ kind: "pin", pin, lat: 37.5, lng: 127.0 }],
    () => "pin-question"
  )

  assert.equal(collection.features.length, 1)
  const [feature] = collection.features
  assert.deepEqual(feature.geometry.coordinates, [127.0, 37.5])
  assert.equal(feature.properties.kind, "pin")
  assert.equal(feature.properties.pinId, 1)
  assert.equal(feature.properties.iconId, "pin-question")
})

test("cluster 항목은 countLabel을 포함한다", () => {
  const collection = buildMarkerFeatureCollection(
    [{ kind: "cluster", clusterId: 5, count: 12, lat: 37.5, lng: 127.0 }],
    () => "unused"
  )

  assert.equal(collection.features[0].properties.kind, "cluster")
  assert.equal(collection.features[0].properties.clusterId, 5)
  assert.equal(collection.features[0].properties.countLabel, "12")
})

test("count가 999를 넘으면 999+로 축약한다", () => {
  assert.equal(formatCount(999), "999")
  assert.equal(formatCount(1000), "999+")
  assert.equal(formatCount(50000), "999+")
})

test("stack 항목은 stackPinIds와 count를 pins.length로부터 채운다", () => {
  const pins = [makePin(1, 37.5, 127.0), makePin(2, 37.5, 127.0), makePin(3, 37.5, 127.0)]
  const collection = buildMarkerFeatureCollection(
    [{ kind: "stack", pins, lat: 37.5, lng: 127.0 }],
    () => "unused"
  )

  const props = collection.features[0].properties
  assert.equal(props.kind, "stack")
  assert.deepEqual(props.stackPinIds, [1, 2, 3])
  assert.equal(props.countLabel, "3")
})
