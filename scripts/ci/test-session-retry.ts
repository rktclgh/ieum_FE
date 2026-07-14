import assert from "node:assert/strict"
import test from "node:test"

import {
  claimRefreshRetry,
  classifyRefreshFailure,
} from "../../src/features/session/lib/session-retry.js"

test("only refresh authorization failures expire the session", () => {
  assert.equal(classifyRefreshFailure(401), "expired")
  assert.equal(classifyRefreshFailure(403), "expired")

  for (const status of [undefined, 0, 429, 500, 503]) {
    assert.equal(classifyRefreshFailure(status), "backend-down")
  }
})

test("each request object can claim refresh retry only once", () => {
  const firstRequest = { url: "/api/v1/users/me" }
  const secondRequest = { url: "/api/v1/users/me" }

  assert.equal(claimRefreshRetry(firstRequest), true)
  assert.equal(claimRefreshRetry(firstRequest), false)
  assert.equal(claimRefreshRetry(firstRequest), false)

  assert.equal(claimRefreshRetry(secondRequest), true)
  assert.equal(claimRefreshRetry(secondRequest), false)
})

test("a copied request config preserves an existing retry claim", () => {
  const originalRequest = { url: "/api/v1/users/me" }

  assert.equal(claimRefreshRetry(originalRequest), true)
  assert.equal(claimRefreshRetry({ ...originalRequest }), false)
})
