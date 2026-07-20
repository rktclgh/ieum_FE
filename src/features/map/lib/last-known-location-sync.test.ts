import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { createLastKnownLocationPayload, createLastKnownLocationSyncCoordinator } from "./last-known-location-sync.ts"

function createSyncRecorder() {
  const requests: Array<{
    payload: { longitude: number; latitude: number }
    callbacks: {
      onSuccess: () => void
      onSettled: () => void
    }
  }> = []

  const coordinator = createLastKnownLocationSyncCoordinator((payload, callbacks) => {
    requests.push({ payload, callbacks })
  })

  return { coordinator, requests }
}

test("creates the users/me/location payload for an authenticated GPS position", () => {
  assert.deepEqual(
    createLastKnownLocationPayload({
      isAuthenticated: true,
      position: { lat: 37.5665, lng: 126.978 },
      lastSyncedPosition: null,
    }),
    {
      latitude: 37.5665,
      longitude: 126.978,
    }
  )
})

test("skips last-known-location sync without an authenticated position", () => {
  assert.equal(
    createLastKnownLocationPayload({
      isAuthenticated: false,
      position: { lat: 37.5665, lng: 126.978 },
      lastSyncedPosition: null,
    }),
    null
  )
  assert.equal(
    createLastKnownLocationPayload({
      isAuthenticated: true,
      position: null,
      lastSyncedPosition: null,
    }),
    null
  )
})

test("dedupes the same GPS coordinate after it has been synced", () => {
  assert.equal(
    createLastKnownLocationPayload({
      isAuthenticated: true,
      position: { lat: 37.5665, lng: 126.978 },
      lastSyncedPosition: { lat: 37.5665, lng: 126.978 },
    }),
    null
  )
})

test("skips GPS jitter within the last synced location threshold", () => {
  assert.equal(
    createLastKnownLocationPayload({
      isAuthenticated: true,
      position: { lat: 37.56695, lng: 126.978 },
      lastSyncedPosition: { lat: 37.5665, lng: 126.978 },
    }),
    null
  )
})

test("creates a payload when GPS moves beyond the last synced location threshold", () => {
  assert.deepEqual(
    createLastKnownLocationPayload({
      isAuthenticated: true,
      position: { lat: 37.5676, lng: 126.978 },
      lastSyncedPosition: { lat: 37.5665, lng: 126.978 },
    }),
    {
      latitude: 37.5676,
      longitude: 126.978,
    }
  )
})

test("records the successful in-flight coordinate even when a newer coordinate is queued", () => {
  const { coordinator, requests } = createSyncRecorder()

  coordinator.sync({ lat: 37.5665, lng: 126.978 }, true)
  coordinator.sync({ lat: 37.5683, lng: 126.978 }, true)

  assert.equal(requests.length, 1)
  requests[0].callbacks.onSuccess()
  requests[0].callbacks.onSettled()
  assert.equal(requests.length, 2)

  requests[1].callbacks.onSettled()
  coordinator.sync({ lat: 37.5665, lng: 126.978 }, true)

  assert.equal(requests.length, 2)
})

test("replaces the queued in-flight coordinate with the latest point and applies threshold after settling", () => {
  const { coordinator, requests } = createSyncRecorder()

  coordinator.sync({ lat: 37.5665, lng: 126.978 }, true)
  coordinator.sync({ lat: 37.5683, lng: 126.978 }, true)
  coordinator.sync({ lat: 37.56695, lng: 126.978 }, true)

  assert.equal(requests.length, 1)
  requests[0].callbacks.onSuccess()
  requests[0].callbacks.onSettled()

  assert.equal(requests.length, 1)
})

test("reset ignores stale callbacks and clears the old queued coordinate", () => {
  const { coordinator, requests } = createSyncRecorder()

  coordinator.sync({ lat: 37.5665, lng: 126.978 }, true)
  coordinator.sync({ lat: 37.5683, lng: 126.978 }, true)

  assert.equal(requests.length, 1)
  coordinator.reset()
  requests[0].callbacks.onSuccess()
  requests[0].callbacks.onSettled()

  assert.equal(requests.length, 1)

  coordinator.sync({ lat: 37.5665, lng: 126.978 }, true)
  assert.equal(requests.length, 2)
})
