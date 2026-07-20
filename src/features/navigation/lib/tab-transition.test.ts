import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { findTabIndex, resolveTabDirection } from "./tab-transition.ts"

test("tab paths resolve regardless of trailing slash", () => {
  assert.equal(findTabIndex("/"), 0)
  assert.equal(findTabIndex("/chats/"), 1)
  assert.equal(findTabIndex("/chats"), 1)
  assert.equal(findTabIndex("/questions/"), 2)
  assert.equal(findTabIndex("/my/"), 3)
})

test("non-tab paths are not tabs, including tab sub-routes", () => {
  assert.equal(findTabIndex("/friends/"), -1)
  assert.equal(findTabIndex("/my/edit/"), -1)
  assert.equal(findTabIndex("/login/"), -1)
})

test("moving to a later tab slides in from the right", () => {
  assert.equal(resolveTabDirection(0, 3), "forward")
  assert.equal(resolveTabDirection(1, 2), "forward")
})

test("마이 → 홈처럼 앞선 탭으로 가면 왼쪽에서 들어온다 (issue #303)", () => {
  assert.equal(resolveTabDirection(3, 0), "backward")
  assert.equal(resolveTabDirection(2, 1), "backward")
})

test("first paint has no previous tab, so it must not animate", () => {
  assert.equal(resolveTabDirection(null, 0), null)
  assert.equal(resolveTabDirection(null, 3), null)
})

test("re-selecting the same tab does not animate", () => {
  assert.equal(resolveTabDirection(2, 2), null)
})

test("navigating to a non-tab route does not animate", () => {
  assert.equal(resolveTabDirection(3, -1), null)
})
