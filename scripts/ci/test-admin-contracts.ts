import assert from "node:assert/strict"
import test from "node:test"

import { resolveAdminGateDecision } from "../../src/features/admin/auth/lib/admin-access.js"
import { compactQuery } from "../../src/features/admin/shared/lib/admin-query.js"
import type {
  AdminGateDecision,
  AdminGatePolicy,
} from "../../src/features/admin/auth/lib/admin-access.js"
import type {
  AdminReportDecision,
  CursorPage,
  JsonValue,
  ReportAiReviewState,
  ReportReason,
  ReportStatus,
  SanctionType,
  UserStatus,
} from "../../src/features/admin/shared/types/admin-types.js"
import type { UserRole } from "../../src/features/session/types/user-role.js"

type Exact<Actual, Expected> =
  (<Type>() => Type extends Actual ? 1 : 2) extends
    (<Type>() => Type extends Expected ? 1 : 2)
    ? (<Type>() => Type extends Expected ? 1 : 2) extends
        (<Type>() => Type extends Actual ? 1 : 2)
      ? true
      : false
    : false

type Expect<Condition extends true> = Condition

const literalUnionContracts: [
  Expect<Exact<UserRole, "user" | "admin">>,
  Expect<Exact<UserStatus, "active" | "suspended">>,
  Expect<Exact<SanctionType, "temporary" | "permanent">>,
  Expect<Exact<ReportReason, "spam" | "ad" | "abuse" | "obscene" | "harassment" | "etc">>,
  Expect<Exact<ReportStatus, "pending" | "ai_reviewed" | "confirmed" | "dismissed">>,
  Expect<
    Exact<
      ReportAiReviewState,
      "pending" | "processing" | "retry" | "completed" | "cancelled" | "dead"
    >
  >,
  Expect<Exact<AdminReportDecision, "suspend" | "hold" | "normal">>,
] = [true, true, true, true, true, true, true]

const protectedCases = [
  [{ kind: "loading" }, "loading"],
  [{ kind: "refreshing" }, "loading"],
  [{ kind: "backend-down", error: new Error("down") }, "backend-down"],
  [{ kind: "guest" }, "redirect-login"],
  [{ kind: "authenticated", user: { role: "user" } }, "forbidden"],
  [{ kind: "authenticated", user: { role: "admin" } }, "allow"],
] as const

const loginCases = [
  [{ kind: "loading" }, "loading"],
  [{ kind: "refreshing" }, "loading"],
  [{ kind: "backend-down", error: new Error("down") }, "backend-down"],
  [{ kind: "guest" }, "allow"],
  [{ kind: "authenticated", user: { role: "user" } }, "forbidden"],
  [{ kind: "authenticated", user: { role: "admin" } }, "redirect-home"],
] as const

test("protected admin routes resolve every canonical auth state", () => {
  for (const [state, expected] of protectedCases) {
    assert.equal(resolveAdminGateDecision("protected", state), expected)
  }
})

test("the admin login route resolves every canonical auth state", () => {
  for (const [state, expected] of loginCases) {
    assert.equal(resolveAdminGateDecision("login", state), expected)
  }
})

test("admin literal unions match the backend contract exactly", () => {
  assert.deepEqual(literalUnionContracts, [true, true, true, true, true, true, true])
})

test("admin gate and shared response contracts expose their agreed shapes", () => {
  const policy: AdminGatePolicy = "protected"
  const decision: AdminGateDecision = "allow"
  const page: CursorPage<JsonValue> = {
    items: [{ role: "admin", status: "active" }],
    nextCursor: null,
  }

  assert.deepEqual(page, {
    items: [{ role: "admin", status: "active" }],
    nextCursor: null,
  })
  assert.equal(policy, "protected")
  assert.equal(decision, "allow")
})

test("compactQuery omits empty values while preserving supported values", () => {
  assert.equal(
    compactQuery({ status: "active", q: "kim", cursor: null, size: 20 }).toString(),
    "status=active&q=kim&size=20",
  )
  assert.equal(compactQuery({ status: "", decision: undefined }).toString(), "")
  assert.equal(compactQuery({ cursor: 0, enabled: false }).toString(), "cursor=0&enabled=false")
})
