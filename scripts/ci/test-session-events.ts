import assert from "node:assert/strict"
import test from "node:test"

import {
  notifySessionExpired,
  subscribeSessionExpired,
} from "../../src/features/session/lib/session-events.js"

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
