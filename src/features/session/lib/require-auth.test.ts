import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { toRequireAuthStatus, decideRequireAuth } from "./require-auth.ts"

test("toRequireAuthStatus: 데이터 객체가 있으면 authenticated", () => {
  assert.equal(toRequireAuthStatus({ data: { userId: 1 }, isPending: false }), "authenticated")
})

test("toRequireAuthStatus: 로그인 데이터가 있으면 재검증 중이어도 authenticated", () => {
  assert.equal(toRequireAuthStatus({ data: { userId: 1 }, isPending: true }), "authenticated")
})

test("toRequireAuthStatus: data null 이고 미확정이면 unresolved", () => {
  assert.equal(toRequireAuthStatus({ data: undefined, isPending: true }), "unresolved")
})

test("toRequireAuthStatus: data null 이고 확정되면 guest", () => {
  assert.equal(toRequireAuthStatus({ data: null, isPending: false }), "guest")
})

test("decideRequireAuth: authenticated → run", () => {
  assert.equal(decideRequireAuth("authenticated"), "run")
})

test("decideRequireAuth: guest → prompt", () => {
  assert.equal(decideRequireAuth("guest"), "prompt")
})

test("decideRequireAuth: unresolved → ignore", () => {
  assert.equal(decideRequireAuth("unresolved"), "ignore")
})
