import assert from "node:assert/strict"
import test from "node:test"

import { resolveAuthState } from "../../src/features/session/lib/auth-state.js"

const user = { id: 1, nickname: "cached-user" }

test("pending auth without a cached user stays loading", () => {
  assert.deepEqual(
    resolveAuthState({
      isPending: true,
      backendUnavailableError: new Error("stale backend outage"),
    }),
    { kind: "loading" },
  )
})

test("a cached user takes precedence over a background error", () => {
  assert.deepEqual(
    resolveAuthState({
      data: user,
      backendUnavailableError: new Error("background backend outage"),
    }),
    { kind: "authenticated", user },
  )
})

test("resolved null without an error is a guest", () => {
  assert.deepEqual(resolveAuthState({ data: null }), { kind: "guest" })
})

test("a preclassified error without a cached user reports a backend outage", () => {
  const error = { status: 503 }

  assert.deepEqual(resolveAuthState({ backendUnavailableError: error }), {
    kind: "backend-down",
    error,
  })
})

test("an unclassified error cannot produce a backend outage", () => {
  // @ts-expect-error -- callers must preclassify backend-unavailable failures
  const state = resolveAuthState<{ id: number }>({ error: new Error("generic") })

  assert.deepEqual(state, { kind: "loading" })
})

test("an unresolved snapshot defaults to loading", () => {
  assert.deepEqual(resolveAuthState({}), { kind: "loading" })
})
