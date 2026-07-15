import assert from "node:assert/strict"
import test from "node:test"

import { resolveAdminGateDecision } from "../../src/features/admin/auth/lib/admin-access.js"
import {
  initialAdminReportDecisionConvergenceState,
  isAdminReportDecisionConvergenceLocked,
  reduceAdminReportDecisionConvergence,
  shouldShowAdminReportResolvedConflict,
} from "../../src/features/admin/reports/lib/admin-report-decision-convergence.js"
import { compactQuery } from "../../src/features/admin/shared/lib/admin-query.js"
import { validateSanctionDraft } from "../../src/features/admin/users/lib/admin-sanction.js"
import type {
  AdminUserActivity,
  AdminUserDetailResponse,
  AdminUserItem,
  AdminUserProfile,
  AdminUserReportItem,
  AdminUserSanctionItem,
  AdminUsersParams,
  AuthProvider,
  CreateSanctionRequest,
  CreateSanctionResponse,
  UserGrade,
} from "../../src/features/admin/users/api/admin-users-api.js"
import { adminEn, adminKo } from "../../src/lib/i18n/messages/admin.js"
import { en } from "../../src/lib/i18n/messages/en.js"
import { ja } from "../../src/lib/i18n/messages/ja.js"
import { ko } from "../../src/lib/i18n/messages/ko.js"
import { ru } from "../../src/lib/i18n/messages/ru.js"
import { th } from "../../src/lib/i18n/messages/th.js"
import { vi } from "../../src/lib/i18n/messages/vi.js"
import { zh } from "../../src/lib/i18n/messages/zh.js"
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
import type { LoginResponse } from "../../src/features/login/api/auth-api.js"
import type { UserMeResponse } from "../../src/features/session/api/session-api.js"
import type { AdminMessages } from "../../src/lib/i18n/messages/admin.js"

type Exact<Actual, Expected> =
  (<Type>() => Type extends Actual ? 1 : 2) extends
    (<Type>() => Type extends Expected ? 1 : 2)
    ? (<Type>() => Type extends Expected ? 1 : 2) extends
        (<Type>() => Type extends Actual ? 1 : 2)
      ? true
      : false
    : false

type Expect<Condition extends true> = Condition
type MutuallyAssignable<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : false
  : false

type StringMessages<Keys extends string> = { [Key in Keys]: string }

type ExpectedAdminUserItem = {
  userId: number
  email: string
  nickname: string
  role: UserRole
  status: UserStatus
  grade: UserGrade
  provider: AuthProvider
  lastActiveAt: string | null
}

type ExpectedAdminUserProfile = {
  userId: number
  email: string
  nickname: string
  role: UserRole
  status: UserStatus
  grade: UserGrade
  provider: AuthProvider
  lastActiveAt: string | null
  birthDate: string | null
  gender: "male" | "female" | "other" | null
  nationality: string | null
  profileImageUrl: string | null
}

type ExpectedAdminUserActivity = {
  questionCount: number
  answerCount: number
  acceptedCount: number
  reportedCount: number
}

type ExpectedAdminUserReportItem = {
  reportId: number
  reason: ReportReason
  status: ReportStatus
  reporterId: number
  reporterNickname: string | null
  messageId: number | null
  detail: string | null
  createdAt: string
}

type ExpectedAdminUserSanctionItem = {
  sanctionId: number
  type: SanctionType
  reason: string
  createdAt: string
  createdBy: number | null
  endsAt: string | null
  releasedAt: string | null
  releasedBy: number | null
}

type ExpectedAdminUserDetailResponse = {
  user: AdminUserProfile
  activity: AdminUserActivity
  reports: AdminUserReportItem[]
  sanctions: AdminUserSanctionItem[]
}

type ExpectedAdminMessages = {
  common: StringMessages<
    "loading" | "loadError" | "empty" | "retry" | "loadMore" | "all" | "save" | "cancel"
  >
  auth: StringMessages<
    | "title"
    | "description"
    | "desktopOnly"
    | "forbidden"
    | "switchAccount"
    | "email"
    | "password"
    | "submit"
    | "loginError"
  >
  navigation: StringMessages<"dashboard" | "users" | "reports" | "inquiries">
  dashboard: StringMessages<
    | "title"
    | "signup"
    | "activeUsers"
    | "suspendedUsers"
    | "pins"
    | "questions"
    | "meetings"
    | "answers"
    | "acceptedRate"
    | "messages"
    | "reports"
    | "aiReviewed"
    | "confirmed"
    | "dismissed"
    | "sanctions"
  > & { range: (from: string, to: string) => string }
  users: StringMessages<
    | "title"
    | "search"
    | "status"
    | "email"
    | "nickname"
    | "role"
    | "grade"
    | "provider"
    | "lastActiveAt"
    | "birthDate"
    | "gender"
    | "nationality"
    | "profileImage"
    | "detail"
    | "activity"
    | "questions"
    | "answers"
    | "accepted"
    | "reported"
    | "reports"
    | "reporter"
    | "messageId"
    | "sanctions"
    | "sanctionType"
    | "temporary"
    | "permanent"
    | "reason"
    | "createdAt"
    | "createdBy"
    | "endsAt"
    | "releasedAt"
    | "releasedBy"
    | "sanction"
    | "activate"
    | "activationConfirm"
    | "activationScopeNotice"
    | "invalidReason"
    | "invalidEndsAt"
  >
  reports: StringMessages<
    | "title"
    | "status"
    | "aiState"
    | "decision"
    | "target"
    | "reporter"
    | "reportedUser"
    | "missingReportedUser"
    | "reason"
    | "createdAt"
    | "detail"
    | "evidence"
    | "evidenceHash"
    | "aiResult"
    | "recommendation"
    | "confidence"
    | "reviewedAt"
    | "modelVersion"
    | "policyVersion"
    | "policySetHash"
    | "lastErrorCode"
    | "resolution"
    | "sanctions"
    | "confirm"
    | "dismiss"
    | "confirmNotice"
    | "resolvedConflict"
    | "convergenceError"
    | "resolutionDecision"
    | "resolvedBy"
    | "resolvedAt"
    | "sanctionSource"
    | "sanctionType"
    | "sanctionReason"
    | "sanctionAdmin"
    | "sanctionStartsAt"
    | "sanctionEndsAt"
    | "sanctionReleasedAt"
    | "sanctionReleasedBy"
    | "sanctionCreatedAt"
  >
  inquiries: StringMessages<
    | "title"
    | "userEmail"
    | "missingUser"
    | "createdAt"
    | "status"
    | "content"
    | "answer"
    | "answeredBy"
    | "answeredAt"
    | "answerPlaceholder"
    | "answerSubmit"
    | "invalidAnswer"
    | "answeredConflict"
  >
}

const adminMessageTypeContracts: [
  Expect<MutuallyAssignable<AdminMessages, ExpectedAdminMessages>>,
  Expect<Exact<keyof AdminMessages, keyof ExpectedAdminMessages>>,
  Expect<Exact<keyof AdminMessages["common"], keyof ExpectedAdminMessages["common"]>>,
  Expect<Exact<keyof AdminMessages["auth"], keyof ExpectedAdminMessages["auth"]>>,
  Expect<Exact<keyof AdminMessages["navigation"], keyof ExpectedAdminMessages["navigation"]>>,
  Expect<Exact<keyof AdminMessages["dashboard"], keyof ExpectedAdminMessages["dashboard"]>>,
  Expect<Exact<keyof AdminMessages["users"], keyof ExpectedAdminMessages["users"]>>,
  Expect<Exact<keyof AdminMessages["reports"], keyof ExpectedAdminMessages["reports"]>>,
  Expect<Exact<keyof AdminMessages["inquiries"], keyof ExpectedAdminMessages["inquiries"]>>,
  Expect<Exact<typeof adminKo, AdminMessages>>,
  Expect<Exact<typeof adminEn, AdminMessages>>,
] = [true, true, true, true, true, true, true, true, true, true, true]

const responseRoleTypeContracts: [
  Expect<Exact<UserMeResponse["role"], UserRole>>,
  Expect<Exact<LoginResponse["role"], UserRole>>,
] = [true, true]

const adminUserDtoTypeContracts: [
  Expect<Exact<UserGrade, "bronze" | "silver" | "gold" | "platinum" | "diamond">>,
  Expect<Exact<AuthProvider, "email" | "google" | "kakao">>,
  Expect<Exact<AdminUserItem, ExpectedAdminUserItem>>,
  Expect<Exact<AdminUserProfile, ExpectedAdminUserProfile>>,
  Expect<Exact<AdminUserActivity, ExpectedAdminUserActivity>>,
  Expect<Exact<AdminUserReportItem, ExpectedAdminUserReportItem>>,
  Expect<Exact<AdminUserSanctionItem, ExpectedAdminUserSanctionItem>>,
  Expect<Exact<AdminUserDetailResponse, ExpectedAdminUserDetailResponse>>,
  Expect<
    Exact<
      CreateSanctionRequest,
      { type: SanctionType; reason: string; endsAt?: string }
    >
  >,
  Expect<Exact<CreateSanctionResponse, { sanctionId: number }>>,
  Expect<
    Exact<
      AdminUsersParams,
      {
        status?: UserStatus | ""
        q?: string
        cursor?: string | null
        size: number
      }
    >
  >,
] = [true, true, true, true, true, true, true, true, true, true, true]

const expectedAdminMessageKeys = {
  common: ["all", "cancel", "empty", "loadError", "loadMore", "loading", "retry", "save"],
  auth: [
    "description", "desktopOnly", "email", "forbidden", "loginError", "password", "submit", "switchAccount", "title",
  ],
  navigation: ["dashboard", "inquiries", "reports", "users"],
  dashboard: [
    "acceptedRate", "activeUsers", "aiReviewed", "answers", "confirmed", "dismissed", "meetings",
    "messages", "pins", "questions", "range", "reports", "sanctions", "signup", "suspendedUsers", "title",
  ],
  users: [
    "accepted", "activate", "activationConfirm", "activationScopeNotice", "activity", "answers", "birthDate",
    "createdAt", "createdBy", "detail", "email", "endsAt", "gender", "grade", "invalidEndsAt", "invalidReason",
    "lastActiveAt", "messageId", "nationality", "nickname", "permanent", "profileImage", "provider", "questions",
    "reason", "releasedAt", "releasedBy", "reported", "reporter", "reports", "role", "sanction", "sanctions",
    "sanctionType", "search", "status", "temporary", "title",
  ],
  reports: [
    "aiResult", "aiState", "confidence", "confirm", "confirmNotice", "convergenceError", "createdAt", "decision",
    "detail", "dismiss", "evidence", "evidenceHash", "lastErrorCode", "missingReportedUser", "modelVersion",
    "policySetHash", "policyVersion", "reason", "recommendation", "reportedUser", "reporter", "resolution",
    "resolutionDecision", "resolvedAt", "resolvedBy", "resolvedConflict", "reviewedAt", "sanctionAdmin",
    "sanctionCreatedAt", "sanctionEndsAt", "sanctionReason", "sanctionReleasedAt", "sanctionReleasedBy",
    "sanctionSource", "sanctionStartsAt", "sanctionType", "sanctions", "status", "target", "title",
  ],
  inquiries: [
    "answer", "answerPlaceholder", "answerSubmit", "answeredAt", "answeredBy", "answeredConflict", "content",
    "createdAt", "invalidAnswer", "missingUser", "status", "title", "userEmail",
  ],
} as const

const literalUnionContracts: [
  Expect<Exact<UserRole, "user" | "admin">>,
  Expect<Exact<AdminGatePolicy, "protected" | "login">>,
  Expect<
    Exact<
      AdminGateDecision,
      | "loading"
      | "backend-down"
      | "redirect-login"
      | "redirect-home"
      | "forbidden"
      | "allow"
    >
  >,
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
] = [true, true, true, true, true, true, true, true, true]

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
  assert.deepEqual(literalUnionContracts, [true, true, true, true, true, true, true, true, true])
})

test("admin message types and both translations expose the exact agreed keys", () => {
  assert.deepEqual(adminMessageTypeContracts, [
    true, true, true, true, true, true, true, true, true, true, true,
  ])

  for (const [group, expectedKeys] of Object.entries(expectedAdminMessageKeys)) {
    const sortedExpectedKeys = [...expectedKeys].sort()
    assert.deepEqual(Object.keys(adminKo[group as keyof AdminMessages]).sort(), sortedExpectedKeys)
    assert.deepEqual(Object.keys(adminEn[group as keyof AdminMessages]).sort(), sortedExpectedKeys)
  }
})

test("admin report resolution and sanction labels preserve their exact semantics", () => {
  assert.deepEqual(
    {
      resolutionDecision: adminKo.reports.resolutionDecision,
      resolvedBy: adminKo.reports.resolvedBy,
      resolvedAt: adminKo.reports.resolvedAt,
      sanctionSource: adminKo.reports.sanctionSource,
      sanctionType: adminKo.reports.sanctionType,
      sanctionReason: adminKo.reports.sanctionReason,
      sanctionAdmin: adminKo.reports.sanctionAdmin,
      sanctionStartsAt: adminKo.reports.sanctionStartsAt,
      sanctionEndsAt: adminKo.reports.sanctionEndsAt,
      sanctionReleasedAt: adminKo.reports.sanctionReleasedAt,
      sanctionReleasedBy: adminKo.reports.sanctionReleasedBy,
      sanctionCreatedAt: adminKo.reports.sanctionCreatedAt,
    },
    {
      resolutionDecision: "처리 결과",
      resolvedBy: "처리 운영자",
      resolvedAt: "처리 일시",
      sanctionSource: "결정 출처",
      sanctionType: "제재 유형",
      sanctionReason: "제재 사유",
      sanctionAdmin: "제재 운영자",
      sanctionStartsAt: "시작 일시",
      sanctionEndsAt: "종료 일시",
      sanctionReleasedAt: "해제 일시",
      sanctionReleasedBy: "해제 운영자",
      sanctionCreatedAt: "제재 생성 일시",
    },
  )
  assert.deepEqual(
    {
      resolutionDecision: adminEn.reports.resolutionDecision,
      resolvedBy: adminEn.reports.resolvedBy,
      resolvedAt: adminEn.reports.resolvedAt,
      sanctionSource: adminEn.reports.sanctionSource,
      sanctionType: adminEn.reports.sanctionType,
      sanctionReason: adminEn.reports.sanctionReason,
      sanctionAdmin: adminEn.reports.sanctionAdmin,
      sanctionStartsAt: adminEn.reports.sanctionStartsAt,
      sanctionEndsAt: adminEn.reports.sanctionEndsAt,
      sanctionReleasedAt: adminEn.reports.sanctionReleasedAt,
      sanctionReleasedBy: adminEn.reports.sanctionReleasedBy,
      sanctionCreatedAt: adminEn.reports.sanctionCreatedAt,
    },
    {
      resolutionDecision: "Resolution",
      resolvedBy: "Resolved by",
      resolvedAt: "Resolved at",
      sanctionSource: "Decision source",
      sanctionType: "Sanction type",
      sanctionReason: "Sanction reason",
      sanctionAdmin: "Sanction administrator",
      sanctionStartsAt: "Starts at",
      sanctionEndsAt: "Ends at",
      sanctionReleasedAt: "Released at",
      sanctionReleasedBy: "Released by",
      sanctionCreatedAt: "Sanction created at",
    },
  )
})

test("successful decisions stay locked through refetch failure until terminal data arrives", () => {
  const refreshing = reduceAdminReportDecisionConvergence(
    initialAdminReportDecisionConvergenceState,
    { type: "begin", reason: "success" },
  )
  const failed = reduceAdminReportDecisionConvergence(refreshing, {
    type: "refetch-failed",
  })
  const retrying = reduceAdminReportDecisionConvergence(failed, { type: "retry" })
  const stalePending = reduceAdminReportDecisionConvergence(retrying, {
    type: "refetch-succeeded",
    reportStatus: "pending",
  })
  const finalRetry = reduceAdminReportDecisionConvergence(stalePending, {
    type: "retry",
  })
  const terminal = reduceAdminReportDecisionConvergence(finalRetry, {
    type: "refetch-succeeded",
    reportStatus: "confirmed",
  })

  for (const state of [refreshing, failed, retrying, stalePending, finalRetry]) {
    assert.equal(isAdminReportDecisionConvergenceLocked(state), true)
    assert.equal(shouldShowAdminReportResolvedConflict(state), false)
  }
  assert.deepEqual(terminal, { kind: "idle" })
  assert.equal(isAdminReportDecisionConvergenceLocked(terminal), false)
})

test("409 decisions reveal conflict copy only after a successful canonical refresh", () => {
  const refreshing = reduceAdminReportDecisionConvergence(
    initialAdminReportDecisionConvergenceState,
    { type: "begin", reason: "conflict" },
  )
  const failed = reduceAdminReportDecisionConvergence(refreshing, {
    type: "refetch-failed",
  })
  const retrying = reduceAdminReportDecisionConvergence(failed, { type: "retry" })
  const refreshedPending = reduceAdminReportDecisionConvergence(retrying, {
    type: "refetch-succeeded",
    reportStatus: "ai_reviewed",
  })

  for (const state of [refreshing, failed, retrying]) {
    assert.equal(isAdminReportDecisionConvergenceLocked(state), true)
    assert.equal(shouldShowAdminReportResolvedConflict(state), false)
  }
  assert.deepEqual(refreshedPending, { kind: "conflict-refreshed" })
  assert.equal(isAdminReportDecisionConvergenceLocked(refreshedPending), false)
  assert.equal(shouldShowAdminReportResolvedConflict(refreshedPending), true)
})

test("admin range messages interpolate both backend dates", () => {
  assert.match(adminKo.dashboard.range("2026-06-15", "2026-07-15"), /2026-06-15.*2026-07-15/)
  assert.match(adminEn.dashboard.range("2026-06-15", "2026-07-15"), /2026-06-15.*2026-07-15/)
})

test("session and login responses expose the exact canonical role type", () => {
  assert.deepEqual(responseRoleTypeContracts, [true, true])
})

test("admin user DTOs preserve every backend field and enum exactly", () => {
  assert.deepEqual(adminUserDtoTypeContracts, [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ])
})

test("all locale objects reuse the intended admin message dictionary reference", () => {
  const localeContracts = [
    [ko.admin, adminKo],
    [en.admin, adminEn],
    [ja.admin, adminEn],
    [zh.admin, adminEn],
    [vi.admin, adminEn],
    [th.admin, adminEn],
    [ru.admin, adminEn],
  ] as const

  for (const [actual, expected] of localeContracts) {
    assert.equal(actual, expected)
  }
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

const sanctionValidationNow = new Date("2026-07-15T00:00:00.000Z")
const futureSanctionEnd = "2026-07-16T00:00:00.000Z"

test("sanction validation trims a valid reason", () => {
  assert.deepEqual(
    validateSanctionDraft(
      { type: "temporary", reason: "  반복적인 괴롭힘  ", endsAt: futureSanctionEnd },
      sanctionValidationNow,
    ),
    {
      ok: true,
      value: {
        type: "temporary",
        reason: "반복적인 괴롭힘",
        endsAt: futureSanctionEnd,
      },
    },
  )
})

test("sanction validation rejects a blank reason", () => {
  assert.deepEqual(
    validateSanctionDraft(
      { type: "permanent", reason: "   ", endsAt: futureSanctionEnd },
      sanctionValidationNow,
    ),
    { ok: false, field: "reason" },
  )
})

test("sanction validation rejects a reason longer than 500 characters", () => {
  assert.deepEqual(
    validateSanctionDraft(
      { type: "permanent", reason: "가".repeat(501), endsAt: futureSanctionEnd },
      sanctionValidationNow,
    ),
    { ok: false, field: "reason" },
  )
})

test("temporary sanctions require an end time", () => {
  assert.deepEqual(
    validateSanctionDraft(
      { type: "temporary", reason: "사유", endsAt: "" },
      sanctionValidationNow,
    ),
    { ok: false, field: "endsAt" },
  )
})

test("temporary sanctions require a future end time", () => {
  assert.deepEqual(
    validateSanctionDraft(
      {
        type: "temporary",
        reason: "사유",
        endsAt: sanctionValidationNow.toISOString(),
      },
      sanctionValidationNow,
    ),
    { ok: false, field: "endsAt" },
  )
})

test("temporary sanctions normalize a future end time to ISO", () => {
  assert.deepEqual(
    validateSanctionDraft(
      { type: "temporary", reason: "사유", endsAt: futureSanctionEnd },
      sanctionValidationNow,
    ),
    {
      ok: true,
      value: { type: "temporary", reason: "사유", endsAt: futureSanctionEnd },
    },
  )
})

test("permanent sanctions omit endsAt even when the draft contains one", () => {
  const result = validateSanctionDraft(
    { type: "permanent", reason: "영구 제재 사유", endsAt: futureSanctionEnd },
    sanctionValidationNow,
  )

  assert.deepEqual(result, {
    ok: true,
    value: { type: "permanent", reason: "영구 제재 사유" },
  })
  assert.equal(result.ok && "endsAt" in result.value, false)
})
