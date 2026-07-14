import assert from "node:assert/strict"
import test from "node:test"

import {
  notifySessionExpired,
  refreshStore,
  setRefreshState,
  subscribeSessionExpired,
} from "../../src/features/session/lib/session-events.js"

test("refresh store publishes only real state transitions", () => {
  const observedStates: string[] = []
  const unsubscribe = refreshStore.subscribe(() => {
    observedStates.push(refreshStore.getSnapshot())
  })

  try {
    assert.equal(refreshStore.getSnapshot(), "idle")
    assert.equal(refreshStore.getServerSnapshot(), "idle")

    setRefreshState("refreshing")
    setRefreshState("refreshing")
    setRefreshState("idle")

    assert.deepEqual(observedStates, ["refreshing", "idle"])
  } finally {
    setRefreshState("idle")
    unsubscribe()
  }
})

test("session-expired subscribers receive notifications until unsubscribe", () => {
  let calls = 0
  const unsubscribe = subscribeSessionExpired(() => {
    calls += 1
  })

  notifySessionExpired()
  assert.equal(calls, 1)

  unsubscribe()
  notifySessionExpired()
  assert.equal(calls, 1)
})

test("unsubscribing one listener leaves other listeners active", () => {
  let firstCalls = 0
  let secondCalls = 0
  const unsubscribeFirst = subscribeSessionExpired(() => {
    firstCalls += 1
  })
  const unsubscribeSecond = subscribeSessionExpired(() => {
    secondCalls += 1
  })

  unsubscribeFirst()
  notifySessionExpired()

  assert.equal(firstCalls, 0)
  assert.equal(secondCalls, 1)
  unsubscribeSecond()
})
