import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
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

test("refreshing auth without a cached user stays behind the loading gate", () => {
  assert.deepEqual(
    resolveAuthState({
      isPending: true,
      isRefreshing: true,
    }),
    { kind: "refreshing" },
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

test("a cached user stays authenticated during a background refresh", () => {
  assert.deepEqual(
    resolveAuthState({
      data: user,
      isRefreshing: true,
      isFetching: true,
    }),
    { kind: "authenticated", user },
  )
})

test("a cached guest stays refreshing until the me refetch publishes its result", () => {
  assert.deepEqual(
    resolveAuthState({
      data: null,
      isFetching: true,
    }),
    { kind: "refreshing" },
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

test("translation hook defaults unauthenticated unless a caller opts in", () => {
  const hook = readFileSync(
    resolve(process.cwd(), "src/features/translate/hooks/use-translate-toggle.ts"),
    "utf8",
  )

  assert.match(hook, /isAuthenticated\s*=\s*false/)
})

test("the auth hook and gate consume the refresh store without exposing children", () => {
  const hook = readFileSync(
    resolve(process.cwd(), "src/features/session/hooks/use-auth-state.ts"),
    "utf8",
  ).replace(/\s+/g, "")
  const gate = readFileSync(
    resolve(process.cwd(), "src/features/session/components/auth-gate.tsx"),
    "utf8",
  ).replace(/\s+/g, "")

  assert.match(hook, /useSyncExternalStore\(refreshStore\.subscribe,refreshStore\.getSnapshot,refreshStore\.getServerSnapshot,?\)/)
  assert.match(hook, /isRefreshing:refreshState==="refreshing"/)
  assert.match(hook, /isFetching,/)
  assert.match(gate, /state\.kind==="loading"\|\|state\.kind==="refreshing"/)
  assert.match(gate, /<SessionLoadingrefreshing=\{state\.kind==="refreshing"\}\/>/)
})
