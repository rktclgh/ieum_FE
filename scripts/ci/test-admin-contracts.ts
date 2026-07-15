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

test("admin gate and shared response contracts expose the agreed literals", () => {
  const role: UserRole = "admin"
  const policy: AdminGatePolicy = "protected"
  const decision: AdminGateDecision = "allow"
  const userStatus: UserStatus = "active"
  const sanctionType: SanctionType = "temporary"
  const reportReason: ReportReason = "spam"
  const reportStatus: ReportStatus = "pending"
  const aiReviewState: ReportAiReviewState = "processing"
  const reportDecision: AdminReportDecision = "hold"
  const page: CursorPage<JsonValue> = {
    items: [{ role, userStatus, sanctionType, reportReason, reportStatus, aiReviewState, reportDecision }],
    nextCursor: null,
  }

  assert.deepEqual(page, {
    items: [
      {
        role: "admin",
        userStatus: "active",
        sanctionType: "temporary",
        reportReason: "spam",
        reportStatus: "pending",
        aiReviewState: "processing",
        reportDecision: "hold",
      },
    ],
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
