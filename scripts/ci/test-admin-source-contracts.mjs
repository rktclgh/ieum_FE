import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const appRoot = path.join(repoRoot, "src/app")

function readSource(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : []
  })
}

function compactSource(source) {
  return source.replace(/\s+/g, " ")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function swapFirst(source, left, right) {
  const marker = "__ADMIN_CONTRACT_SWAP__"

  assert.equal(source.includes(marker), false)
  assert.notEqual(source.indexOf(left), -1)
  assert.notEqual(source.indexOf(right), -1)

  return source.replace(left, marker).replace(right, left).replace(marker, right)
}

function asyncFunctionSource(source, functionName) {
  const start = source.indexOf(`async function ${functionName}(`)
  const nextFunction = source.indexOf("\nasync function ", start + 1)
  const nextExport = source.indexOf("\nexport ", start + 1)
  const end = nextFunction === -1 ? nextExport : nextFunction

  assert.notEqual(start, -1, `${functionName} must exist`)
  assert.ok(end > start, `${functionName} must have a bounded source block`)

  return source.slice(start, end)
}

function assertAdminUserDetailRemountsByUserId(source) {
  assert.match(
    source,
    /<AdminUserDetailPage key=\{userId\} userId=\{userId\} \/>/,
  )
}

function boundedSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)

  assert.notEqual(start, -1, `${startMarker} must exist`)
  assert.ok(end > start, `${startMarker} must end before ${endMarker}`)

  return source.slice(start, end)
}

function assertOrdered(source, markers) {
  let previousIndex = -1

  for (const marker of markers) {
    const index = source.indexOf(marker, previousIndex + 1)
    assert.ok(index > previousIndex, `${marker} must preserve handler order`)
    previousIndex = index
  }
}

function assertAdminUserCursorRetry(source) {
  const compact = compactSource(source)
  const pagination = compactSource(
    boundedSource(
      source,
      "{usersQuery.isFetchNextPageError ? (",
      "\n      )}\n    </section>",
    ),
  )

  assert.match(
    compact,
    /usersQuery\.isError && !usersQuery\.isFetchNextPageError && \(/,
  )
  assertOrdered(pagination, [
    "usersQuery.isFetchNextPageError ? (",
    '<AdminAsyncState kind="error"',
    "usersQuery.fetchNextPage({ cancelRefetch: false })",
    ") : usersQuery.hasNextPage ? (",
    "<Button",
    "usersQuery.fetchNextPage({ cancelRefetch: false })",
  ])
  assert.equal(
    (pagination.match(/usersQuery\.fetchNextPage\(\{ cancelRefetch: false \}\)/g) ?? [])
      .length,
    2,
  )
  assert.equal((pagination.match(/<AdminAsyncState/g) ?? []).length, 1)
  assert.equal((pagination.match(/messages\.admin\.common\.loadMore/g) ?? []).length, 1)
  assert.doesNotMatch(pagination, /usersQuery\.refetch\(\)/)
  assert.match(pagination, /retryDisabled=\{usersQuery\.isFetching\}/)
  assert.match(pagination, /isRetrying=\{usersQuery\.isFetching\}/)
  assert.match(pagination, /disabled=\{usersQuery\.isFetching\}/)
  assert.match(pagination, /aria-busy=\{usersQuery\.isFetching \|\| undefined\}/)
  assert.doesNotMatch(pagination, /disabled=\{usersQuery\.isFetchingNextPage\}/)
}

function assertSanctionConfirmationLatch(source) {
  const compact = compactSource(source)
  const handler = compactSource(
    boundedSource(
      source,
      "const handleSanctionConfirm = () =>",
      "const handleActivateConfirm = () =>",
    ),
  )

  assert.match(source, /const sanctionConfirmLatch = React\.useRef\(false\)/)
  assert.match(
    source,
    /const \[sanctionConfirmBusy, setSanctionConfirmBusy\] = React\.useState\(false\)/,
  )
  assert.match(
    compact,
    /const sanctionBusy = sanctionConfirmBusy \|\| sanctionMutation\.isPending/,
  )
  assertOrdered(handler, [
    "if (!pendingSanction || sanctionConfirmLatch.current) return",
    "sanctionConfirmLatch.current = true",
    "setSanctionConfirmBusy(true)",
    "sanctionMutation.mutate(pendingSanction, {",
    "onSettled: () => {",
    "sanctionConfirmLatch.current = false",
    "setSanctionConfirmBusy(false)",
  ])
  assert.equal((handler.match(/sanctionMutation\.mutate\(/g) ?? []).length, 1)
  assert.ok((source.match(/disabled=\{sanctionBusy\}/g) ?? []).length >= 4)
  assert.match(source, /confirmDisabled=\{sanctionBusy\}/)
  assert.match(
    compact,
    /if \(!sanctionBusy && !sanctionConfirmLatch\.current\) setSanctionConfirmOpen\(open\)/,
  )
  assert.doesNotMatch(source, /disabled=\{sanctionMutation\.isPending\}/)
  assert.doesNotMatch(source, /confirmDisabled=\{sanctionMutation\.isPending\}/)
}

function assertActivationConfirmationLatch(source) {
  const compact = compactSource(source)
  const handler = compactSource(
    boundedSource(
      source,
      "const handleActivateConfirm = () =>",
      "if (detailQuery.isPending)",
    ),
  )

  assert.match(source, /const activateConfirmLatch = React\.useRef\(false\)/)
  assert.match(
    source,
    /const \[activateConfirmBusy, setActivateConfirmBusy\] = React\.useState\(false\)/,
  )
  assert.match(
    compact,
    /const activateBusy = activateConfirmBusy \|\| activateMutation\.isPending/,
  )
  assertOrdered(handler, [
    "if (activateConfirmLatch.current) return",
    "activateConfirmLatch.current = true",
    "setActivateConfirmBusy(true)",
    "activateMutation.mutate(undefined, {",
    "onSettled: () => {",
    "activateConfirmLatch.current = false",
    "setActivateConfirmBusy(false)",
  ])
  assert.equal((handler.match(/activateMutation\.mutate\(/g) ?? []).length, 1)
  assert.match(source, /disabled=\{activateBusy\}/)
  assert.match(source, /confirmDisabled=\{activateBusy\}/)
  assert.match(
    compact,
    /if \(!activateBusy && !activateConfirmLatch\.current\) setActivateConfirmOpen\(open\)/,
  )
  assert.doesNotMatch(source, /disabled=\{activateMutation\.isPending\}/)
  assert.doesNotMatch(source, /confirmDisabled=\{activateMutation\.isPending\}/)
}

function assertAdminSanctionStatsInvalidation(source) {
  const invalidation = compactSource(
    boundedSource(
      source,
      "function invalidateAdminSanctionQueries(",
      "function useAdminUsers(",
    ),
  )
  const sanctionHook = compactSource(
    boundedSource(
      source,
      "function useCreateAdminUserSanction(",
      "function useActivateAdminUser(",
    ),
  )
  const activationHook = compactSource(
    boundedSource(source, "function useActivateAdminUser(", "\nexport {"),
  )

  assert.match(invalidation, /invalidateAdminUserQueries\(queryClient, userId\)/)
  assert.match(
    invalidation,
    /invalidateQueries\(\{ queryKey: adminStatsKeys\.overview,? \}\)/,
  )
  assert.equal((invalidation.match(/adminStatsKeys\./g) ?? []).length, 1)
  assert.doesNotMatch(invalidation, /adminStatsKeys\.(?:users|content|reports)/)
  assert.doesNotMatch(invalidation, /exact: true/)
  assert.match(
    sanctionHook,
    /onSuccess: \(\) => invalidateAdminSanctionQueries\(queryClient, userId\)/,
  )
  assert.match(
    activationHook,
    /invalidateAdminUserQueries\(queryClient, userId\)/,
  )
  assert.match(
    activationHook,
    /invalidateQueries\(\{ queryKey: adminStatsKeys\.overview,? \}\)/,
  )
  assert.doesNotMatch(activationHook, /invalidateAdminSanctionQueries/)
  assert.doesNotMatch(activationHook, /adminStatsKeys\.(?:users|content|reports)/)
  assert.doesNotMatch(activationHook, /exact: true/)
}

function interfaceFields(source, interfaceName) {
  const match = source.match(
    new RegExp(
      `interface ${interfaceName}(?: extends [^{]+)? \\{([\\s\\S]*?)\\n\\}`,
    ),
  )

  assert.ok(match, `${interfaceName} must exist`)
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

const adminReportDtoFields = {
  AdminReportUserSummary: [
    "userId: number",
    "nickname: string",
  ],
  AdminReportTargetSummary: [
    "type: AdminReportTargetType",
    "id: number",
    "deleted: boolean",
  ],
  AdminReportAiSummary: [
    "reviewState: ReportAiReviewState",
    "recommendation: string | null",
    "decision: AdminReportDecision | null",
    "confidence: number | null",
    "reviewedAt: string | null",
  ],
  AdminReportListItem: [
    "reportId: number",
    "target: AdminReportTargetSummary",
    "reporter: AdminReportUserSummary",
    "reportedUser: AdminReportUserSummary | null",
    "reason: ReportReason",
    "status: ReportStatus",
    "ai: AdminReportAiSummary",
    "createdAt: string",
  ],
  AdminReportListResponse: [
    "items: AdminReportListItem[]",
    "nextCursor: string | null",
  ],
  AdminReportAiDetail: [
    "reviewState: ReportAiReviewState",
    "recommendation: string | null",
    "reason: string | null",
    "confidence: number | null",
    "modelVersion: string | null",
    "policyVersion: string | null",
    "reviewedAt: string | null",
    "decision: AdminReportDecision | null",
    "policySetHash: string | null",
    "result: JsonValue | null",
    "lastErrorCode: string | null",
  ],
  AdminReportResolution: [
    "decision: ReportStatus",
    "resolvedBy: AdminReportUserSummary",
    "resolvedAt: string",
  ],
  AdminReportSanctionItem: [
    "sanctionId: number",
    "decisionSource: string",
    'type: "temporary" | "permanent"',
    "reason: string",
    "admin: AdminReportUserSummary | null",
    "startsAt: string",
    "endsAt: string | null",
    "releasedAt: string | null",
    "releasedBy: AdminReportUserSummary | null",
    "createdAt: string",
  ],
  AdminReportDetailResponse: [
    "detail: string | null",
    "contextSnapshot: JsonValue | null",
    "contextHash: string | null",
    "ai: AdminReportAiDetail",
    "resolution: AdminReportResolution | null",
    "sanctions: AdminReportSanctionItem[]",
  ],
  AdminReportsParams: [
    'status?: ReportStatus | ""',
    'aiReviewState?: ReportAiReviewState | ""',
    'decision?: AdminReportDecision | ""',
    "cursor?: string | null",
    "size: number",
  ],
}

function assertAdminReportDtoContracts(source) {
  const compact = compactSource(source)

  assert.match(compact, /type AdminReportTargetType = "message" \| "answer"/)
  assert.match(
    compact,
    /interface AdminReportDetailResponse extends Omit<AdminReportListItem, "ai">/,
  )
  for (const [interfaceName, fields] of Object.entries(adminReportDtoFields)) {
    assert.deepEqual(interfaceFields(source, interfaceName), fields)
  }
}

function assertAdminReportApiBindings(source) {
  const list = compactSource(asyncFunctionSource(source, "getAdminReports"))
  const detail = compactSource(asyncFunctionSource(source, "getAdminReport"))
  const confirm = compactSource(asyncFunctionSource(source, "confirmAdminReport"))
  const dismiss = compactSource(asyncFunctionSource(source, "dismissAdminReport"))

  assert.match(list, /apiClient\.get<AdminReportListResponse>/)
  assert.match(list, /"\/api\/v1\/admin\/reports"/)
  assert.match(
    list,
    /params: compactQuery\(\{ status: params\.status, aiReviewState: params\.aiReviewState, decision: params\.decision, cursor: params\.cursor, size: params\.size,? \}\)/,
  )
  assert.match(detail, /apiClient\.get<AdminReportDetailResponse>/)
  assert.match(detail, /`\/api\/v1\/admin\/reports\/\$\{reportId\}`/)
  assert.match(
    confirm,
    /apiClient\.post\(`\/api\/v1\/admin\/reports\/\$\{reportId\}\/confirm`\)/,
  )
  assert.match(
    dismiss,
    /apiClient\.post\(`\/api\/v1\/admin\/reports\/\$\{reportId\}\/dismiss`\)/,
  )
  assert.equal((source.match(/apiClient\.get/g) ?? []).length, 2)
  assert.equal((source.match(/apiClient\.post/g) ?? []).length, 2)
  assert.doesNotMatch(source, /apiClient\.(?:patch|put|delete)/)
}

function assertAdminReportHooks(source) {
  const compact = compactSource(source)
  const decisionInvalidation = compactSource(
    boundedSource(
      source,
      "function invalidateAdminReportDecisionQueries(",
      "function invalidateAdminReportDismissalQueries(",
    ),
  )
  const dismissalInvalidation = compactSource(
    boundedSource(
      source,
      "function invalidateAdminReportDismissalQueries(",
      "function useAdminReports(",
    ),
  )
  const confirmHook = compactSource(
    boundedSource(
      source,
      "function useConfirmAdminReport(",
      "function useDismissAdminReport(",
    ),
  )
  const dismissHook = compactSource(
    boundedSource(source, "function useDismissAdminReport(", "\nexport {"),
  )

  assert.match(source, /useInfiniteQuery/)
  assert.match(
    source,
    /queryKey:\s*adminReportKeys\.list\(\{ status, aiReviewState, decision, size \}\)/,
  )
  assert.match(
    compact,
    /queryFn: \(\{ pageParam \}\) => getAdminReports\(\{ status, aiReviewState, decision, cursor: pageParam, size,? \}\)/,
  )
  assert.match(source, /initialPageParam:\s*null as string \| null/)
  assert.match(source, /getNextPageParam:\s*\(page\) => page\.nextCursor/)
  assert.match(source, /queryKey:\s*adminReportKeys\.detail\(reportId\)/)
  assert.match(source, /queryFn:\s*\(\) => getAdminReport\(reportId\)/)

  assert.match(
    decisionInvalidation,
    /invalidateQueries\(\{ queryKey: adminReportKeys\.lists\(\) \}\)/,
  )
  assert.match(
    decisionInvalidation,
    /invalidateQueries\(\{ queryKey: adminReportKeys\.detail\(reportId\), exact: true, refetchType: "none",? \}\)/,
  )
  assert.match(
    decisionInvalidation,
    /invalidateQueries\(\{ queryKey: adminStatsKeys\.overview,? \}\)/,
  )
  assert.doesNotMatch(decisionInvalidation, /adminStatsKeys\.(?:users|content|reports)/)
  assert.doesNotMatch(decisionInvalidation, /exact: true[^}]*adminStatsKeys|adminStatsKeys[^}]*exact: true/)
  assert.doesNotMatch(decisionInvalidation, /adminUserKeys/)

  assert.match(
    dismissalInvalidation,
    /invalidateAdminReportDecisionQueries\(queryClient, reportId\)/,
  )
  assert.match(
    dismissalInvalidation,
    /invalidateQueries\(\{ queryKey: adminUserKeys\.lists\(\) \}\)/,
  )
  assert.match(dismissalInvalidation, /if \(reportedUserId !== null\)/)
  assert.match(
    dismissalInvalidation,
    /invalidateQueries\(\{ queryKey: adminUserKeys\.detail\(reportedUserId\), exact: true,? \}\)/,
  )

  assert.match(confirmHook, /mutationFn: \(\) => confirmAdminReport\(reportId\)/)
  assert.match(
    confirmHook,
    /onSettled: \(\) => invalidateAdminReportDecisionQueries\(queryClient, reportId\)/,
  )
  assert.match(dismissHook, /mutationFn: \(\) => dismissAdminReport\(reportId\)/)
  assert.match(
    dismissHook,
    /onSettled: \(\) => invalidateAdminReportDismissalQueries\(queryClient, reportId, reportedUserId\)/,
  )
  assert.doesNotMatch(confirmHook + dismissHook, /onSuccess:/)
}

function assertAdminReportCursorRetry(source) {
  const compact = compactSource(source)
  const pagination = compactSource(
    boundedSource(
      source,
      "{reportsQuery.isFetchNextPageError ? (",
      "\n      )}\n    </section>",
    ),
  )

  assert.match(
    compact,
    /reportsQuery\.isError && !reportsQuery\.isFetchNextPageError && \(/,
  )
  assertOrdered(pagination, [
    "reportsQuery.isFetchNextPageError ? (",
    '<AdminAsyncState kind="error"',
    "reportsQuery.fetchNextPage({ cancelRefetch: false })",
    ") : reportsQuery.hasNextPage ? (",
    "<Button",
    "reportsQuery.fetchNextPage({ cancelRefetch: false })",
  ])
  assert.equal(
    (pagination.match(/reportsQuery\.fetchNextPage\(\{ cancelRefetch: false \}\)/g) ?? [])
      .length,
    2,
  )
  assert.equal((pagination.match(/<AdminAsyncState/g) ?? []).length, 1)
  assert.doesNotMatch(pagination, /reportsQuery\.refetch\(\)/)
  assert.match(pagination, /retryDisabled=\{reportsQuery\.isFetching\}/)
  assert.match(pagination, /isRetrying=\{reportsQuery\.isFetching\}/)
  assert.match(pagination, /disabled=\{reportsQuery\.isFetching\}/)
  assert.match(pagination, /aria-busy=\{reportsQuery\.isFetching \|\| undefined\}/)
  assert.doesNotMatch(pagination, /disabled=\{reportsQuery\.isFetchingNextPage\}/)
}

function assertAdminReportDetailRemountsByReportId(source) {
  assert.match(
    source,
    /<AdminReportDetailPage key=\{reportId\} reportId=\{reportId\} \/>/,
  )
}

function assertAdminReportDecisionConvergenceState(source) {
  const compact = compactSource(source)

  assert.match(
    compact,
    /type AdminReportDecisionConvergenceReason = "success" \| "conflict" \| "uncertain"/,
  )
  assert.match(
    compact,
    /type AdminReportDecisionConvergenceState = \| \{ kind: "idle" \} \| \{ kind: "refreshing"; reason: AdminReportDecisionConvergenceReason \} \| \{ kind: "retry"; reason: AdminReportDecisionConvergenceReason \} \| \{ kind: "conflict-refreshed" \}/,
  )
  assert.match(
    compact,
    /if \(event\.type === "refetch-failed"\) \{ return \{ kind: "retry", reason: state\.reason \} \}/,
  )
  assert.match(
    compact,
    /if \(state\.reason === "conflict"\) \{ if \( ?event\.reportStatus === "confirmed" \|\| event\.reportStatus === "dismissed" ?\) \{ return \{ kind: "conflict-refreshed" \} \} return \{ kind: "retry", reason: state\.reason \} \}/,
  )
  assert.match(
    compact,
    /if \(state\.reason === "uncertain"\) \{ return initialAdminReportDecisionConvergenceState \}/,
  )
  assert.match(
    compact,
    /if \( ?event\.reportStatus === "confirmed" \|\| event\.reportStatus === "dismissed" ?\) \{ return initialAdminReportDecisionConvergenceState \}/,
  )
  assert.match(
    compact,
    /return state\.kind === "refreshing" \|\| state\.kind === "retry"/,
  )
  assert.match(
    compact,
    /return state\.kind === "conflict-refreshed"/,
  )
}

function assertAdminReportDecisionConvergence(source) {
  const compact = compactSource(source)
  const refresh = compactSource(
    boundedSource(
      source,
      "const refreshDecisionConvergence = async (",
      "const beginDecisionConvergence = (",
    ),
  )
  const begin = compactSource(
    boundedSource(
      source,
      "const beginDecisionConvergence = (",
      "const retryDecisionConvergence = () =>",
    ),
  )
  const retry = compactSource(
    boundedSource(
      source,
      "const retryDecisionConvergence = () =>",
      "const handleDecisionConfirm = () =>",
    ),
  )
  const handler = compactSource(
    boundedSource(
      source,
      "const handleDecisionConfirm = () =>",
      "if (detailQuery.isPending)",
    ),
  )

  assert.match(
    source,
    /type DecisionLatchState = "idle" \| "mutation" \| "refreshing" \| "retry"/,
  )
  assert.match(
    source,
    /const decisionLatch = React\.useRef<DecisionLatchState>\("idle"\)/,
  )
  assert.equal((source.match(/React\.useRef/g) ?? []).length, 1)
  assert.match(
    source,
    /const \[decisionBusyState, setDecisionBusyState\] = React\.useState\(false\)/,
  )
  assert.match(
    compact,
    /const decisionBusy = decisionBusyState \|\| confirmMutation\.isPending \|\| dismissMutation\.isPending \|\| isAdminReportDecisionConvergenceLocked\(convergenceState\)/,
  )
  assert.equal(
    (refresh.match(/detailQuery\.refetch\(\{ cancelRefetch: true \}\)/g) ?? [])
      .length,
    1,
  )
  assert.match(
    refresh,
    /refreshResult\.isError \|\| refreshResult\.data === undefined/,
  )
  assert.ok((refresh.match(/type: "refetch-failed"/g) ?? []).length >= 2)
  assert.match(refresh, /type: "refetch-succeeded"/)
  assert.match(refresh, /reportStatus: refreshResult\.data\.status/)
  assertOrdered(refresh, [
    "setConvergenceState(nextState)",
    "if (isAdminReportDecisionConvergenceLocked(nextState)) {",
    'decisionLatch.current = "retry"',
    "return",
    "releaseDecisionLock()",
  ])
  assert.match(begin, /type: "begin", reason/)
  assert.match(begin, /decisionLatch\.current = "refreshing"/)
  assert.match(begin, /void refreshDecisionConvergence\(refreshingState\)/)
  assert.match(
    retry,
    /if \(decisionLatch\.current !== "retry" \|\| convergenceState\.kind !== "retry"\) return/,
  )
  assert.match(retry, /type: "retry"/)
  assert.match(retry, /decisionLatch\.current = "refreshing"/)
  assert.match(retry, /void refreshDecisionConvergence\(refreshingState\)/)
  assertOrdered(handler, [
    'if (!pendingDecision || decisionLatch.current !== "idle") return',
    'decisionLatch.current = "mutation"',
    "setDecisionBusyState(true)",
    'pendingDecision === "confirm" ? confirmMutation : dismissMutation',
    "mutation.mutate(undefined, {",
    "onSettled: (_data, error) => {",
    "setPendingDecision(null)",
    "const reason =",
  ])
  assert.match(
    handler,
    /onSettled: \(_data, error\) => \{ setPendingDecision\(null\) const reason = error === null \? "success" : isReportDecisionConflict\(error\) \? "conflict" : "uncertain" beginDecisionConvergence\(reason\) \}/,
  )
  assert.doesNotMatch(handler, /releaseDecisionLock\(\)/)
  assert.doesNotMatch(handler, /onError:/)
  assert.doesNotMatch(handler, /detailQuery\.refetch/)
  assert.equal((handler.match(/mutation\.mutate\(/g) ?? []).length, 1)
  assert.ok((source.match(/disabled=\{decisionBusy\}/g) ?? []).length >= 2)
  assert.match(source, /confirmDisabled=\{decisionBusy\}/)
  assert.match(
    source,
    /convergenceState\.kind === "retry" && \(/,
  )
  assert.equal(
    (source.match(/convergenceState\.kind === "retry" && \(/g) ?? []).length,
    1,
  )
  assert.match(source, /message=\{messages\.admin\.reports\.convergenceError\}/)
  assert.match(
    compact,
    /const decisionError = mutationError && !isReportDecisionConflict\(mutationError\) \? getApiErrorMessage\(mutationError, messages\.admin\.common\.loadError\) : null/,
  )
  assert.equal((source.match(/\{decisionError && \(/g) ?? []).length, 1)
  assert.match(source, /onRetry=\{retryDecisionConvergence\}/)
  assert.equal(
    (source.match(/onRetry=\{retryDecisionConvergence\}/g) ?? []).length,
    1,
  )
  assert.match(
    source,
    /\{detailQuery\.isError &&\s*!isAdminReportDecisionConvergenceLocked\(convergenceState\) && \(/,
  )
  assert.match(
    source,
    /shouldShowAdminReportResolvedConflict\(convergenceState\) && \(/,
  )
  assert.match(
    compact,
    /if \(!decisionBusy && decisionLatch\.current === "idle" && !open\) setPendingDecision\(null\)/,
  )
  assert.equal((source.match(/<ConfirmDialog/g) ?? []).length, 1)
}

function assertAdminReportSemanticLabels(source) {
  const resolution = compactSource(
    boundedSource(
      source,
      '<section aria-labelledby="admin-report-resolution-title"',
      '<section aria-labelledby="admin-report-sanctions-title"',
    ),
  )
  const sanctionHeader = compactSource(
    boundedSource(source, '<thead className="bg-gray-50', "</thead>"),
  )

  assertOrdered(resolution, [
    "label={messages.admin.reports.resolutionDecision}",
    "value={resolution.decision}",
    "label={messages.admin.reports.resolvedBy}",
    "resolution.resolvedBy.nickname",
    "resolution.resolvedBy.userId",
    "label={messages.admin.reports.resolvedAt}",
    "resolution.resolvedAt",
  ])
  assert.doesNotMatch(
    resolution,
    /label=\{messages\.admin\.reports\.(?:decision|reporter|createdAt)\}/,
  )
  assertOrdered(sanctionHeader, [
    "messages.admin.reports.sanctionSource",
    "messages.admin.reports.sanctionType",
    "messages.admin.reports.sanctionReason",
    "messages.admin.reports.sanctionAdmin",
    "messages.admin.reports.sanctionStartsAt",
    "messages.admin.reports.sanctionEndsAt",
    "messages.admin.reports.sanctionReleasedAt",
    "messages.admin.reports.sanctionReleasedBy",
    "messages.admin.reports.sanctionCreatedAt",
  ])
  assert.doesNotMatch(
    sanctionHeader,
    />\s*(?:source|type|admin|startsAt|endsAt|releasedAt|releasedBy)\s*</,
  )
}

function assertAdminInquiryApiContracts(source) {
  const compact = compactSource(source)
  const list = compactSource(asyncFunctionSource(source, "getAdminInquiries"))
  const detail = compactSource(asyncFunctionSource(source, "getAdminInquiry"))
  const answer = compactSource(asyncFunctionSource(source, "answerAdminInquiry"))

  assert.match(
    compact,
    /interface AdminInquiryItem \{ inquiryId: number userId: number userEmail: string \| null title: string content: string status: AdminInquiryStatus answer: string \| null answeredBy: number \| null answeredAt: string \| null createdAt: string \}/,
  )
  assert.match(
    compact,
    /interface AdminInquiriesParams \{ status\?: AdminInquiryStatus \| "" cursor\?: string \| null size: number \}/,
  )
  assert.match(compact, /interface AnswerInquiryRequest \{ answer: string \}/)
  assert.match(list, /signal\?: AbortSignal/)
  assert.match(
    list,
      /apiClient\.get<CursorPage<AdminInquiryItem>>\( "\/api\/v1\/admin\/inquiries", \{ params: compactQuery\(\{ status: params\.status, cursor: params\.cursor, size: params\.size, \}\), signal, \}, \)/,
  )
  assert.match(detail, /signal\?: AbortSignal/)
  assert.match(
    detail,
    /apiClient\.get<AdminInquiryItem>\( `\/api\/v1\/admin\/inquiries\/\$\{inquiryId\}`, \{ signal \}, \)/,
  )
  assert.match(detail, /Promise<AdminInquiryItem>/)
  assert.match(
    answer,
    /apiClient\.post\(`\/api\/v1\/admin\/inquiries\/\$\{inquiryId\}\/answer`, body\)/,
  )
  assert.doesNotMatch(compact, /findAnsweredAdminInquiry|SCAN_PAGE_LIMIT|seenCursors|maxPages/)
  assert.equal((list.match(/apiClient\.get/g) ?? []).length, 1)
  assert.equal((detail.match(/apiClient\.get/g) ?? []).length, 1)
  assert.equal((answer.match(/apiClient\.post/g) ?? []).length, 1)
}

function assertAdminInquiryHooks(source) {
  const compact = compactSource(source)
  const listOptions = compactSource(
    boundedSource(
      source,
      "function adminInquiriesInfiniteQueryOptions(",
      "function invalidateAdminInquiryQueries(",
    ),
  )
  const invalidation = compactSource(
    boundedSource(
      source,
      "function invalidateAdminInquiryQueries(",
      "function createAdminInquiryAnswerDependencies(",
    ),
  )
  const dependencies = compactSource(
    boundedSource(
      source,
      "function createAdminInquiryAnswerDependencies(",
      "function useAdminInquiries(",
    ),
  )
  const listHook = compactSource(
    boundedSource(source, "function useAdminInquiries(", "function useAdminInquiryAnswerLifecycles("),
  )
  const lifecycleHook = compactSource(
    boundedSource(source, "function useAdminInquiryAnswerLifecycles(", "function useAnswerAdminInquiry("),
  )
  const answerHook = compactSource(
    boundedSource(source, "function useAnswerAdminInquiry(", "function getAdminInquiryLifecycleRecords("),
  )

  assert.match(compact, /all: \["admin", "inquiries"\] as const/)
  assert.match(compact, /lists: \(\) => \[\.\.\.adminInquiryKeys\.all, "list"\] as const/)
  assert.match(
    compact,
    /list: \(\{ status, size \}: Omit<AdminInquiriesParams, "cursor">\) => \[ \.\.\.adminInquiryKeys\.lists\(\), \{ status, size \}, \] as const/,
  )
  assert.match(
    invalidation,
    /Promise\.all\(\[ queryClient\.invalidateQueries\(\{ queryKey: adminInquiryKeys\.all, refetchType: "none", \}\), queryClient\.invalidateQueries\(\{ queryKey: adminStatsKeys\.overview, \}\), \]\)/,
  )
  assert.doesNotMatch(invalidation, /exact: true/)
  assert.equal((invalidation.match(/adminStatsKeys\./g) ?? []).length, 1)
  assert.match(listOptions, /queryKey: adminInquiryKeys\.list\(\{ status, size \}\)/)
  assert.match(
    listOptions,
    /getAdminInquiries\(\{ status, cursor: pageParam, size \}, signal\)/,
  )
  assert.match(listOptions, /initialPageParam: null as string \| null/)
  assert.match(listOptions, /getNextPageParam: \(page: \{ nextCursor: string \| null \}\) => page\.nextCursor/)
  assert.match(listHook, /useInfiniteQuery\(adminInquiriesInfiniteQueryOptions\(\{ status, size \}\)\)/)
  assertOrdered(dependencies, [
    "answerInquiry: answerAdminInquiry",
    "getCanonicalInquiry: (inquiryId, { signal } = {}) =>",
    "getAdminInquiry(inquiryId, signal)",
    "invalidateInquiries: () => invalidateAdminInquiryQueries(queryClient)",
    'getApiErrorCode(error) === "INQUIRY_ALREADY_ANSWERED"',
    "refetchActiveLists: () => refetchActiveAdminInquiryLists(queryClient)",
  ])
  assert.equal((dependencies.match(/getAdminInquiry\(/g) ?? []).length, 1)
  assert.equal((dependencies.match(/refetchActiveAdminInquiryLists/g) ?? []).length, 1)
  assert.doesNotMatch(
    dependencies,
    /fetchInfiniteQuery|refetchQueries|getQueryData|refetchCanonicalList|findAnsweredInquiry/,
  )
  assertOrdered(lifecycleHook, [
    "queryKey: adminInquiryAnswerLifecycleKey",
    "initialData: () => getAdminInquiryAnswerLifecycleRegistry(queryClient)",
    "enabled: false",
    "gcTime: Infinity",
    "staleTime: Infinity",
  ])
  assertOrdered(answerHook, [
    "createAdminInquiryAnswerMutationOptions(queryClient, dependencies)",
    "const execution = claimAdminInquiryAnswer(queryClient, input)",
    "if (execution === null) return false",
    "mutation.mutate(execution)",
    "retryAdminInquiryAnswerConvergence(",
  ])
  assert.doesNotMatch(answerHook, /mutation\.mutate\([^)]*,\s*\{/)
  assert.match(source, /import \{ adminStatsKeys \} from "@\/features\/admin\/dashboard\/lib\/admin-stats-keys"/)
}

function assertAdminInquiryAnswerLifecycle(source) {
  const compact = compactSource(source)
  const activeListRefetch = compactSource(
    boundedSource(
      source,
      "function refetchActiveAdminInquiryLists(",
      "function getAdminInquiryAnswerLifecycleRegistry(",
    ),
  )
  const claim = compactSource(
    boundedSource(source, "function claimAdminInquiryAnswer(", "function beginAdminInquiryAnswerConvergence("),
  )
  const convergence = compactSource(
    boundedSource(source, "async function runAdminInquiryAnswerConvergence(", "function createAdminInquiryAnswerMutationOptions("),
  )
  const mutation = compactSource(
    boundedSource(source, "function createAdminInquiryAnswerMutationOptions(", "async function retryAdminInquiryAnswerConvergence("),
  )
  const retry = compactSource(
    boundedSource(source, "async function retryAdminInquiryAnswerConvergence(", "export {"),
  )
  const controller = compactSource(
    boundedSource(
      source,
      "function getConvergenceController(",
      "function releaseConvergenceController(",
    ),
  )
  const releaseController = compactSource(
    boundedSource(
      source,
      "function releaseConvergenceController(",
      "function isAdminInquiryAnswerExecutionCurrent(",
    ),
  )
  const currentExecution = compactSource(
    boundedSource(
      source,
      "function isAdminInquiryAnswerExecutionCurrent(",
      "async function runAdminInquiryAnswerConvergence(",
    ),
  )

  assert.match(compact, /"answer-lifecycles"/)
  assert.match(compact, /"answer"/)
  assert.match(
    compact,
    /const adminInquiryListKey = \["admin", "inquiries", "list"\] as const/,
  )
  assertOrdered(activeListRefetch, [
    "queryClient.refetchQueries(",
    '{ queryKey: adminInquiryListKey, type: "active" }',
    "{ cancelRefetch: true, throwOnError: true }",
  ])
  assert.equal((activeListRefetch.match(/refetchQueries/g) ?? []).length, 1)
  assert.doesNotMatch(
    compact,
    /findAnsweredInquiry|refetchCanonicalList|AdminInquiryStatus|status: current\.status|size: current\.size/,
  )
  assert.match(
    compact,
    /interface AdminInquiryAnswerExecution extends AdminInquiryAnswerInput \{ operationId: number sessionGeneration: number \}/,
  )
  assert.match(
    compact,
    /interface AdminInquiryAnswerLifecycle \{ operationId: number sessionGeneration: number/,
  )
  assertOrdered(claim, [
    "const sessionGeneration = getSessionGeneration(queryClient)",
    "isAdminInquiryAnswerConvergenceLocked(current.state)",
    "operationId: registry.nextOperationId",
    "sessionGeneration",
    'state: { kind: "mutation" }',
  ])
  assert.match(compact, /current\?\.operationId !== execution\.operationId/)
  assert.match(
    compact,
    /current\.sessionGeneration !== execution\.sessionGeneration/,
  )
  assertOrdered(controller, [
    "previous?.controller.abort()",
    "previous?.detachSessionAbort()",
    "const sessionSignal = getSessionAbortSignal(queryClient)",
    "sessionSignal.addEventListener(\"abort\", abortForSessionReset",
    "operationId: execution.operationId",
    "sessionGeneration: execution.sessionGeneration",
    "detachSessionAbort:",
  ])
  assertOrdered(releaseController, [
    "active?.operationId !== execution.operationId",
    "active.sessionGeneration !== execution.sessionGeneration",
    "active.detachSessionAbort()",
  ])
  assertOrdered(currentExecution, [
    "isSessionGenerationCurrent(queryClient, execution.sessionGeneration)",
    "current?.operationId === execution.operationId",
    "current.sessionGeneration === execution.sessionGeneration",
  ])
  assertOrdered(mutation, [
    "mutationKey: adminInquiryAnswerMutationKey",
    "mutationFn:",
    "onSettled: async (",
    'error === null ? "success"',
    'dependencies.isAlreadyAnsweredError(error) ? "conflict" : "uncertain"',
    "beginAdminInquiryAnswerConvergence(",
    "await runAdminInquiryAnswerConvergence(",
  ])
  assert.equal((convergence.match(/dependencies\.refetchActiveLists/g) ?? []).length, 1)
  assert.equal((convergence.match(/dependencies\.getCanonicalInquiry/g) ?? []).length, 1)
  assertOrdered(convergence, [
    "await dependencies.invalidateInquiries()",
    "await dependencies.refetchActiveLists()",
    "const canonicalInquiry = await dependencies.getCanonicalInquiry(",
    "execution.inquiry.inquiryId",
    "{ signal: controller.signal }",
    "inquiryStatus: canonicalInquiry.status",
    'canonicalInquiry.status === "answered" ? canonicalInquiry : null',
  ])
  assert.doesNotMatch(convergence, /canonicalItems|\.find\(/)
  assert.match(convergence, /type: "refetch-failed"/)
  assert.equal((convergence.match(/controller\.signal\.aborted/g) ?? []).length, 3)
  assert.ok(
    (convergence.match(/isAdminInquiryAnswerExecutionCurrent/g) ?? []).length >= 4,
  )
  assertOrdered(retry, [
    'current?.state.kind !== "retry"',
    "isSessionGenerationCurrent(queryClient, current.sessionGeneration)",
    'type: "retry"',
    'nextState.kind !== "refreshing"',
    "sessionGeneration: current.sessionGeneration",
    "await runAdminInquiryAnswerConvergence(",
  ])
}

function assertAdminInquirySessionAbortBoundary(source) {
  const compact = compactSource(source)
  const rotate = compactSource(
    boundedSource(
      source,
      "function rotateSessionAbortSignal(",
      "function isSessionGenerationCurrent(",
    ),
  )
  const reset = compactSource(
    boundedSource(
      source,
      "async function runSessionCacheReset(",
      "function resetSessionCache(",
    ),
  )

  assert.match(
    compact,
    /const sessionAbortControllers = new WeakMap<QueryClient, AbortController>\(\)/,
  )
  assertOrdered(rotate, [
    "sessionAbortControllers.get(queryClient)?.abort()",
    "sessionAbortControllers.set(queryClient, new AbortController())",
  ])
  assertOrdered(reset, [
    "rotateSessionAbortSignal(queryClient)",
    "sessionGenerations.set(",
    "const queryCache = queryClient.getQueryCache()",
    "queryClient.getMutationCache().clear()",
  ])
}

function assertAdminInquiryCursorRetry(source) {
  const compact = compactSource(source)
  const pagination = compactSource(
    boundedSource(
      source,
      "{inquiriesQuery.isFetchNextPageError ? (",
      "\n      )}\n    </section>",
    ),
  )

  assert.match(
    compact,
    /inquiriesQuery\.isError && !inquiriesQuery\.isFetchNextPageError && !answerBusy && \(/,
  )
  assert.match(
    compact,
    /inquiriesQuery\.isError && inquiries\.length === 0 && !answerBusy \? \(/,
  )
  assertOrdered(pagination, [
    "inquiriesQuery.isFetchNextPageError ? (",
    '<AdminAsyncState kind="error"',
    "inquiriesQuery.fetchNextPage({ cancelRefetch: false })",
    ") : inquiriesQuery.hasNextPage ? (",
    "<Button",
    "inquiriesQuery.fetchNextPage({ cancelRefetch: false })",
  ])
  assert.equal(
    (pagination.match(/inquiriesQuery\.fetchNextPage\(\{ cancelRefetch: false \}\)/g) ?? [])
      .length,
    2,
  )
  assert.equal((pagination.match(/<AdminAsyncState/g) ?? []).length, 1)
  assert.doesNotMatch(pagination, /inquiriesQuery\.refetch\(\)/)
  assert.match(pagination, /retryDisabled=\{listBusy\}/)
  assert.match(pagination, /isRetrying=\{listBusy\}/)
  assert.match(pagination, /disabled=\{listBusy\}/)
  assert.match(pagination, /aria-busy=\{listBusy \|\| undefined\}/)
  assert.doesNotMatch(pagination, /disabled=\{inquiriesQuery\.isFetchingNextPage\}/)
}

function assertAdminInquiryAnswerConvergenceState(source) {
  const compact = compactSource(source)

  assert.match(
    compact,
    /type AdminInquiryAnswerConvergenceReason = \| "success" \| "conflict" \| "uncertain"/,
  )
  assert.match(
    compact,
    /if \(event\.type === "refetch-failed"\) \{ return \{ kind: "retry", reason: state\.reason \} \}/,
  )
  assert.doesNotMatch(compact, /inquiryStatus: AdminInquiryStatus \| "missing"/)
  assert.match(
    compact,
    /if \(state\.reason === "uncertain"\) \{ return initialAdminInquiryAnswerConvergenceState \}/,
  )
  assert.match(
    compact,
    /if \(event\.inquiryStatus !== "answered"\) \{ return \{ kind: "retry", reason: state\.reason \} \}/,
  )
  assert.match(
    compact,
    /return state\.reason === "conflict" \? \{ kind: "conflict-refreshed" \} : initialAdminInquiryAnswerConvergenceState/,
  )
  assert.match(
    compact,
    /state\.kind === "mutation" \|\| state\.kind === "refreshing" \|\| state\.kind === "retry"/,
  )
  assert.match(compact, /return state\.kind === "conflict-refreshed"/)
  assert.match(
    compact,
    /function shouldShowAdminInquiryPageConvergence\( state: AdminInquiryAnswerConvergenceState, targetInquiryId: number \| null, selectedInquiryId: number \| null, targetIsVisible: boolean, \) \{ return \( isAdminInquiryAnswerConvergenceLocked\(state\) && targetInquiryId !== null && \(!targetIsVisible \|\| targetInquiryId !== selectedInquiryId\) \) \}/,
  )
  assert.match(
    compact,
    /function getAdminInquiryExpandedConvergenceKind\( state: AdminInquiryAnswerConvergenceState, \) \{ if \(state\.kind === "retry"\) return "retry" as const if \(state\.kind === "mutation" \|\| state\.kind === "refreshing"\) \{ return "loading" as const \} return null \}/,
  )
}

function assertAdminInquiryExpansion(source) {
  const compact = compactSource(source)
  const tableHeader = compactSource(
    boundedSource(source, '<thead className="bg-gray-50', "</thead>"),
  )
  const selectionReconciliation = compactSource(
    boundedSource(
      source,
      "if (previousVisibleInquiryIds !== visibleInquiryIds) {",
      "const handleStatusChange = (",
    ),
  )
  const statusHandler = compactSource(
    boundedSource(
      source,
      "const handleStatusChange = (",
      "return (",
    ),
  )

  assert.match(
    source,
    /const \[selectedInquiryId, setSelectedInquiryId\] = React\.useState<number \| null>\(null\)/,
  )
  assert.match(source, /const visibleInquiryIds = inquiries\.map\(\(inquiry\) => inquiry\.inquiryId\)\.join\(","\)/)
  assert.match(
    compact,
    /const \[previousVisibleInquiryIds, setPreviousVisibleInquiryIds\] = React\.useState\(visibleInquiryIds\)/,
  )
  assertOrdered(selectionReconciliation, [
    "setPreviousVisibleInquiryIds(visibleInquiryIds)",
    "if (selectedInquiryId !== null && !selectedInquiryExists)",
    "setSelectedInquiryId(null)",
  ])
  assert.doesNotMatch(source, /React\.useEffect/)
  assertOrdered(statusHandler, ["setSelectedInquiryId(null)", "setStatus("])
  assert.match(source, /<React\.Fragment key=\{inquiry\.inquiryId\}>/)
  assert.match(
    compact,
    /<button type="button"[\s\S]*aria-expanded=\{isExpanded\}[\s\S]*aria-controls=\{`admin-inquiry-detail-\$\{inquiry\.inquiryId\}`\}/,
  )
  assert.match(
    source,
    /id=\{`admin-inquiry-detail-\$\{inquiry\.inquiryId\}`\}/,
  )
  assert.doesNotMatch(source, /<tr[^>]*onClick=/)
  assert.match(
    source,
    /<AdminInquiryExpandedRow\s+key=\{inquiry\.inquiryId\}/,
  )
  assert.match(source, /inquiry\.userEmail \?\? messages\.admin\.inquiries\.missingUser/)
  assert.match(source, /inquiry\.title/)
  assert.match(source, /inquiry\.status/)
  assert.match(source, /inquiry\.createdAt/)
  assert.match(source, /inquiry\.content/)
  assert.match(source, /inquiry\.answer/)
  assert.match(source, /inquiry\.answeredBy/)
  assert.match(source, /inquiry\.answeredAt/)
  assert.match(
    compact,
    /const resolvedAnswer: AdminInquiryAnswerResolution \| null = latestAnswerLifecycle\?\.snapshot\?\.status === "answered"/,
  )
  assert.match(
    compact,
    /resolvedAnswer !== null && selectedInquiryId !== resolvedAnswer\.inquiry\.inquiryId && \(/,
  )
  assert.match(
    source,
    /<AdminInquiryAnsweredDetails\s+inquiry=\{resolvedAnswer\.inquiry\}[\s\S]*showConflict=\{resolvedAnswer\.showConflict\}/,
  )
  assert.match(source, /<table/)
  assert.match(source, /<textarea/)
  assert.match(source, /maxLength=\{2000\}/)
  assert.match(source, /inquiry\.status === "answered"/)
  assert.match(source, /disabled=\{answerBusy \|\| normalizedAnswer === null\}/)
  assert.match(source, /messages\.admin\.inquiries\.invalidAnswer/)
  assertOrdered(tableHeader, [
    "messages.admin.inquiries.userEmail",
    "messages.admin.inquiries.subject",
    "messages.admin.inquiries.status",
    "messages.admin.inquiries.createdAt",
  ])
  assert.doesNotMatch(tableHeader, /messages\.admin\.inquiries\.content/)
}

function assertAdminInquiryAnswerConvergence(source) {
  const expanded = compactSource(
    boundedSource(
      source,
      "function AdminInquiryExpandedRow(",
      "function AdminInquiriesPage()",
    ),
  )
  const page = compactSource(
    boundedSource(source, "function AdminInquiriesPage()", "export {"),
  )
  const retry = compactSource(
    boundedSource(
      source,
      "const retryAnswerConvergence = () =>",
      "const handleAnswerSubmit = (",
    ),
  )
  const submit = compactSource(
    boundedSource(
      source,
      "const handleAnswerSubmit = (",
      "const handleInquiryToggle = (",
    ),
  )
  const formSubmit = compactSource(
    boundedSource(
      source,
      "const handleAnswerFormSubmit = (",
      'if (inquiry.status === "answered")',
    ),
  )

  assertOrdered(page, [
    "useAnswerAdminInquiry()",
    "useAdminInquiryAnswerLifecycles()",
    "getAdminInquiryLifecycleRecords(",
    "findLast((record) =>",
    "isAdminInquiryAnswerConvergenceLocked(record.state)",
  ])
  assert.match(
    page,
    /const answerBusy = activeAnswerLifecycle !== undefined \|\| answerMutation\.isPending/,
  )
  assert.doesNotMatch(source, /AnswerLatchState|answerLatch|setConvergenceState/)
  assert.doesNotMatch(source, /answerMutation\.mutate\(/)
  assert.doesNotMatch(source, /onSettled:/)
  assert.match(
    retry,
    /activeAnswerLifecycle\?\.state\.kind !== "retry"/,
  )
  assert.match(retry, /answerMutation\.retryConvergence\( activeAnswerLifecycle\.inquiry\.inquiryId, \)/)
  assertOrdered(formSubmit, [
    "event.preventDefault()",
    "const answer = normalizeInquiryAnswer(draft)",
    "if (answer === null) return",
    "onAnswerSubmit(inquiry, answer)",
  ])
  assertOrdered(submit, [
    "answerMutation.reset()",
    "answerMutation.submit({",
    "answer",
    "inquiry",
  ])
  assert.doesNotMatch(submit, /size: 20|status,/)
  assert.equal((submit.match(/answerMutation\.submit\(/g) ?? []).length, 1)
  assert.match(
    page,
    /lifecycle\?\.settledReason === "uncertain" && lifecycle\.mutationError !== null && !isAdminInquiryAnswerConvergenceLocked\(lifecycle\.state\)/,
  )
  assertOrdered(expanded, [
    "getAdminInquiryExpandedConvergenceKind(convergenceState)",
    'expandedConvergenceKind === "retry"',
    '<AdminAsyncState kind="error"',
    "onRetry={onConvergenceRetry}",
    'expandedConvergenceKind === "loading"',
    '<AdminAsyncState kind="loading"',
    'if (inquiry.status === "answered")',
    "{convergenceView}",
    "<AdminInquiryAnsweredDetails",
  ])
  assert.equal(
    (expanded.match(/onRetry=\{onConvergenceRetry\}/g) ?? []).length,
    1,
  )
  assert.match(expanded, /shouldShowAdminInquiryAnsweredConflict\(convergenceState\)/)
  assert.match(
    page,
    /const showPageConvergence = shouldShowAdminInquiryPageConvergence\( convergenceState, answerTarget\?\.inquiryId \?\? null, selectedInquiryId, answerTargetIsVisible, \)/,
  )
  assert.match(
    page,
    /showPageConvergence && \( convergenceState\.kind === "retry" \? \( <AdminAsyncState kind="error" message=\{messages\.admin\.inquiries\.convergenceError\} onRetry=\{retryAnswerConvergence\}/,
  )
  assert.equal(
    (page.match(/onRetry=\{retryAnswerConvergence\}/g) ?? []).length,
    1,
  )
  assert.match(
    page,
    /convergenceState\.kind === "refreshing" \|\| convergenceState\.kind === "mutation"/,
  )
  assert.match(page, /findAdminInquiryLifecycle\( answerLifecycleRegistry, inquiry, \)/)
  assert.match(page, /convergenceState=\{rowConvergenceState\}/)
}

function assertKnowledgeCandidateContracts({
  apiSource,
  hookSource,
  pageSource,
  routeSource,
  shellSource,
}) {
  const compactApi = compactSource(apiSource)
  const compactHook = compactSource(hookSource)
  const compactPage = compactSource(pageSource)
  const compactRoute = compactSource(routeSource)
  const predicateSource = compactSource(
    boundedSource(
      apiSource,
      "const KNOWLEDGE_RELATION_PREDICATES = [",
      "] as const",
    ),
  )

  for (const endpoint of [
    '"/api/v1/admin/knowledge/relation-candidates"',
    "`/api/v1/admin/knowledge/relation-candidates/${candidateId}`",
    "`/api/v1/admin/knowledge/relation-candidates/${candidateId}/approve`",
    "`/api/v1/admin/knowledge/relation-candidates/${candidateId}/reject`",
  ]) {
    assert.match(apiSource, new RegExp(escapeRegExp(endpoint)))
  }
  assert.match(
    compactApi,
    /interface ApproveKnowledgeCandidateRequest \{ version: number subject: string predicate: KnowledgeRelationPredicate object: string \}/,
  )
  assert.match(
    compactApi,
    /interface RejectKnowledgeCandidateRequest \{ version: number reason\?: string \}/,
  )
  assert.match(compactApi, /type KnowledgeCandidateStatus = \| "pending" \| "approved" \| "rejected" \| "invalidated"/)
  assert.match(apiSource, /type KnowledgeRelationPredicate =/)
  assert.match(apiSource, /evidenceChunkId: number/)
  assert.match(apiSource, /evidenceExcerpt: string/)
  assert.match(apiSource, /reviewerUserId: number \| null/)
  assert.match(apiSource, /reviewedAt: string \| null/)
  assert.match(apiSource, /reviewNote: string \| null/)
  assert.match(apiSource, /promotionRelationId: number \| null/)
  assert.match(apiSource, /questionId: number/)
  assert.match(apiSource, /answerId: number/)
  assert.match(apiSource, /displayName: string/)
  assert.match(apiSource, /validUntil: string \| null/)
  assert.match(apiSource, /eligible: boolean/)
  assert.match(apiSource, /questionTitle: string/)
  assert.match(apiSource, /questionContent: string/)
  assert.match(apiSource, /answerContent: string/)
  assert.match(apiSource, /chunkContent: string/)
  assert.match(apiSource, /sourceId: number/)
  assert.match(
    compactApi,
    /interface AdminKnowledgeCandidateDecisionResponse \{ candidateId: number status: KnowledgeCandidateStatus version: number relation: AdminKnowledgeSameSourceRelation \| null \}/,
  )
  assert.doesNotMatch(apiSource, /sourceType: string/)
  assert.doesNotMatch(apiSource, /canonicalUrl: string/)
  assert.doesNotMatch(apiSource, /chunkId: number/)
  assert.doesNotMatch(apiSource, /evidenceText: string/)
  assert.equal(
    predicateSource,
    'const KNOWLEDGE_RELATION_PREDICATES = [ "requires", "applies_to", "located_in", "exception_of", "prevents", "supports", "has_deadline", "depends_on", "reported_to", "used_for", ',
  )
  assert.match(compactApi, /params: compactQuery\(\{ status: params\.status, cursor: params\.cursor, size: params\.size,? \}\)/)
  assert.match(compactApi, /apiClient\.post<AdminKnowledgeCandidateDecisionResponse>\( `\/api\/v1\/admin\/knowledge\/relation-candidates\/\$\{candidateId\}\/approve`, body,? \)/)
  assert.match(compactApi, /apiClient\.post<AdminKnowledgeCandidateDecisionResponse>\( `\/api\/v1\/admin\/knowledge\/relation-candidates\/\$\{candidateId\}\/reject`, body,? \)/)

  assert.match(
    compactHook,
    /list: \(\{ status, size \}: Omit<AdminKnowledgeCandidatesParams, "cursor">\) => \[ \.\.\.adminKnowledgeCandidateKeys\.lists\(\), \{ status, size \}, \] as const/,
  )
  assert.match(compactPage, /React\.useState<KnowledgeCandidateStatus>\("pending"\)/)
  assert.match(compactPage, /useAdminKnowledgeCandidates\(\{ status, size: 20 \}\)/)
  assert.match(compactRoute, /searchParams\.get\("candidateId"\)/)
  assert.match(compactRoute, /parsePositiveInteger\(candidateIdValue\)/)
  assert.match(compactRoute, /<AdminKnowledgeCandidateDetailPage key=\{candidateId\} candidateId=\{candidateId\} \/>/)
  assert.match(pageSource, /routes\.adminKnowledgeCandidate\(candidate\.candidateId\)/)
  assert.match(pageSource, /<select[^>]*id="admin-knowledge-predicate"/)
  assert.match(pageSource, /KNOWLEDGE_RELATION_PREDICATES\.map/)
  assert.match(pageSource, /const canAct = candidate\??\.status === "pending"/)
  assert.match(pageSource, /\{canAct \? \(/)
  assert.match(pageSource, /candidate\.evidenceExcerpt/)
  assert.match(pageSource, /candidate\.sourceId/)
  assert.match(pageSource, /candidate\.source\.displayName/)
  assert.match(pageSource, /candidate\.source\.questionTitle/)
  assert.match(pageSource, /candidate\.source\.questionContent/)
  assert.match(pageSource, /candidate\.source\.answerContent/)
  assert.match(pageSource, /candidate\.source\.chunkContent/)
  assert.match(pageSource, /candidate\.evidenceChunkId/)
  assert.doesNotMatch(pageSource, /candidate\.source\.sourceType/)
  assert.doesNotMatch(pageSource, /candidate\.source\.canonicalUrl/)
  assert.doesNotMatch(pageSource, /candidate\.chunkId/)
  assert.doesNotMatch(pageSource, /candidate\.evidenceText/)
  assert.doesNotMatch(pageSource, /dangerouslySetInnerHTML/)
  assert.match(pageSource, /detailQuery\.isError/)
  assert.match(pageSource, /onRetry=\{\(\) => void detailQuery\.refetch\(\)\}/)
  assert.match(pageSource, /messages\.route\.invalidLink/)
  assert.match(pageSource, /getApiErrorStatus\(error\) === 409/)
  assert.match(pageSource, /code === "KNOWLEDGE_CANDIDATE_CONCURRENTLY_CHANGED"/)
  assert.match(pageSource, /code === "KNOWLEDGE_CANDIDATE_SOURCE_INELIGIBLE"/)
  assert.doesNotMatch(pageSource, /getApiErrorCode\(error\) === "KNOWLEDGE_CANDIDATE_CONFLICT"/)
  assert.match(pageSource, /detailQuery\.refetch\(\{ cancelRefetch: true \}\)/)
  assert.match(
    hookSource,
    /queryClient\.invalidateQueries\(\{ queryKey: adminKnowledgeCandidateKeys\.lists\(\) \}\)/,
  )
  assert.match(
    compactHook,
    /queryClient\.invalidateQueries\(\{ queryKey: adminKnowledgeCandidateKeys\.detail\(candidateId\), exact: true, refetchType: "none",? \}\)/,
  )
  assert.match(compactHook, /onSettled: \(\) => invalidateAdminKnowledgeCandidateQueries\(queryClient, candidateId\)/)
  assert.doesNotMatch(hookSource, /onSuccess:/)
  assert.match(shellSource, /routes\.adminKnowledge\(\)/)
  assert.match(shellSource, /messages\.admin\.navigation\.knowledge/)
}

function assertAdminStatsOverviewContract({
  apiSource,
  hookSource,
  keysSource,
  componentSource,
}) {
  const compactApi = compactSource(apiSource)
  const compactHook = compactSource(hookSource)
  const compactKeys = compactSource(keysSource)
  const compactComponent = compactSource(componentSource)

  assert.match(apiSource, /interface AdminStatsOverview/)
  for (const field of [
    "from: string",
    "to: string",
    'bucket: "day"',
    "summary: {",
    "series: Array<{",
    "queues: {",
    "pendingReportCount: number",
    "retryReportCount: number",
    "deadReportCount: number",
    "pendingInquiryCount: number",
  ]) {
    assert.match(apiSource, new RegExp(escapeRegExp(field)))
  }

  assert.equal((apiSource.match(/apiClient\.get/g) ?? []).length, 1)
  assert.match(
    compactApi,
    /apiClient\.get<AdminStatsOverview>\( "\/api\/v1\/admin\/stats\/overview", \{ params: compactQuery\(\{ from: params\.from, to: params\.to, bucket: params\.bucket, \}\), signal, \}, \)/,
  )
  assert.doesNotMatch(
    apiSource,
    /\/api\/v1\/admin\/stats\/(?:users|content|reports)/,
  )

  assert.match(
    compactKeys,
    /overview: \["admin", "stats", "overview"\] as const/,
  )
  assert.match(
    compactKeys,
    /overviewRange: \(\{ from, to, bucket \}: AdminStatsOverviewParams\) => \[ \.\.\.adminStatsKeys\.overview, \{ from, to, bucket \}, \] as const/,
  )
  assert.match(hookSource, /function useAdminStatsOverview\(range: AdminStatsOverviewParams\)/)
  assert.equal((hookSource.match(/useQuery\s*\(\s*\{/g) ?? []).length, 1)
  assert.match(
    compactHook,
    /queryKey: adminStatsKeys\.overviewRange\(\{ from: range\.from, to: range\.to, bucket: range\.bucket,? \}\)/,
  )
  assert.match(hookSource, /queryFn: \(\{ signal \}\) => getAdminStatsOverview\(range, signal\)/)
  assert.match(hookSource, /placeholderData: \(previousData\) => previousData/)
  assert.doesNotMatch(
    hookSource,
    /getAdmin(?:User|Content|Report)Stats|adminStatsKeys\.(?:users|content|reports)|Promise\.all/,
  )

  for (const days of [7, 30, 90]) {
    assert.match(componentSource, new RegExp(`value=\\{${days}\\}`))
  }
  assert.match(componentSource, /type="date"/)
  assert.match(componentSource, /import \{ getKstDateKey \} from "@\/lib\/date\/kst"/)
  assert.match(componentSource, /const dateKeyPattern = \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//)
  assert.match(componentSource, /const to = getKstDateKey\(\)/)
  assert.match(componentSource, /const from = getKstDateKey\(kstDateKeyToTime\(to\) - \(days - 1\) \* dayMs\)/)
  assert.match(componentSource, /getKstDateKey\(fromTime\) !== from \|\| getKstDateKey\(toTime\) !== to/)
  assert.match(componentSource, /const inclusiveDays = \(toTime - fromTime\) \/ dayMs \+ 1/)
  assert.match(componentSource, /inclusiveDays >= 1 && inclusiveDays <= 366/)
  assert.match(componentSource, /if \(!validRange\) return/)
  assert.match(componentSource, /<code className="font-semibold">INVALID_STATS_RANGE<\/code>/)
  assert.doesNotMatch(componentSource, /getFullYear|getMonth|getDate/)
  assert.match(componentSource, /onRetry=\{\(\) => void refetch\(\)\}/)
  assert.match(componentSource, /retryDisabled=\{isFetching\}/)
  assert.match(componentSource, /isRetrying=\{isFetching\}/)
  assert.match(componentSource, /aria-busy=\{isFetching \|\| undefined\}/)
  assert.match(componentSource, /series\.length === 0/)
  assert.match(componentSource, /<svg[\s\S]*aria-label=\{ariaLabel\}/)
  assert.match(componentSource, /<table className="sr-only">/)
  assert.match(compactComponent, /rangeSummary\( title, from, to, points, latestPoint \)/)
  assert.match(componentSource, /messages\.admin\.dashboard\.userTrend/)
  assert.match(componentSource, /messages\.admin\.dashboard\.contentTrend/)
  assert.match(componentSource, /messages\.admin\.dashboard\.reportTrend/)
  assert.doesNotMatch(
    componentSource,
    /from\s+["'][^"']*(?:chart|recharts)|import\s+["'][^"']*(?:chart|recharts)/i,
  )
}

function dynamicDirectories(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []

    const entryPath = path.join(directory, entry.name)
    const current = /\[[^\]]+\]/.test(entry.name)
      ? [path.relative(appRoot, entryPath)]
      : []

    return [...current, ...dynamicDirectories(entryPath)]
  })
}

test("the static app router contains no runtime dynamic directory", () => {
  assert.deepEqual(dynamicDirectories(appRoot), [])
})

test("dynamic directory detection includes interception-prefixed bracket segments", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ieum-admin-routes-"))
  const dynamicNames = ["(.)[id]", "(..)[...slug]"]

  try {
    for (const name of dynamicNames) {
      fs.mkdirSync(path.join(fixtureRoot, name))
    }

    assert.deepEqual(
      dynamicDirectories(fixtureRoot).map((directory) => path.basename(directory)).sort(),
      dynamicNames.sort(),
    )
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true })
  }
})

test("the admin route layouts own noindex metadata and the approved boundary order", () => {
  const adminLayout = compactSource(readSource("src/app/admin/layout.tsx"))
  const protectedLayout = compactSource(
    readSource("src/app/admin/(protected)/layout.tsx"),
  )
  const loginPage = compactSource(readSource("src/app/admin/login/page.tsx"))

  assert.match(
    adminLayout,
    /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,?\s*\}/,
  )
  assert.match(
    protectedLayout,
    /<AdminGate policy="protected">\s*<AdminDesktopBoundary>\s*<AdminShell>\s*\{children\}\s*<\/AdminShell>\s*<\/AdminDesktopBoundary>\s*<\/AdminGate>/,
  )
  assert.match(
    loginPage,
    /<AdminGate policy="login">\s*<AdminDesktopBoundary>\s*<AdminLoginPage \/>\s*<\/AdminDesktopBoundary>\s*<\/AdminGate>/,
  )
  assert.doesNotMatch(loginPage, /AdminShell/)
})

test("AdminGate redirects from canonical decisions and keeps forbidden users in place", () => {
  const source = readSource("src/features/admin/auth/components/admin-gate.tsx")

  assert.match(source, /resolveAdminGateDecision\(policy, state\)/)
  assert.match(source, /router\.replace\(routes\.adminLogin\(\)\)/)
  assert.match(source, /router\.replace\(routes\.adminHome\(\)\)/)
  assert.doesNotMatch(source, /routes\.(?:login|home)\(\)/)
  assert.match(source, /decision === "backend-down"/)
  assert.match(source, /onRetry=\{\(\) => void refetch\(\)\}/)
  assert.match(source, /decision === "forbidden"/)
  assert.match(source, /<LogoutButton \/>/)
})

test("the desktop boundary does not mount children below 1024px", () => {
  const source = readSource(
    "src/features/admin/shared/components/admin-desktop-boundary.tsx",
  )
  const unsupportedBranch = source.indexOf("if (!isDesktop)")
  const childrenReturn = source.indexOf("return children")

  assert.match(source, /useSyncExternalStore/)
  assert.match(source, /\(min-width: 1024px\)/)
  assert.match(source, /let cachedMediaQueryList:/)
  assert.match(
    compactSource(source),
    /if \(cachedMediaQueryList !== undefined\) return cachedMediaQueryList/,
  )
  assert.match(source, /function getServerSnapshot\(\)\s*\{\s*return false\s*\}/)
  assert.ok(unsupportedBranch >= 0)
  assert.ok(childrenReturn > unsupportedBranch)
})

test("admin login is controlled, pending-safe, and delegates authority to canonical me", () => {
  const source = readSource("src/features/admin/auth/components/admin-login-page.tsx")

  assert.match(source, /useLogin\(\)/)
  assert.match(source, /loginMutation\.mutate\(\{ email, password \}\)/)
  assert.match(source, /value=\{email\}/)
  assert.match(source, /value=\{password\}/)
  assert.match(source, /loginMutation\.isError/)
  assert.ok((source.match(/disabled=\{loginMutation\.isPending\}/g) ?? []).length >= 3)
  assert.doesNotMatch(source, /LoginResponse|localStorage|sessionStorage/)
})

test("disabled credential fields also disable their auxiliary controls", () => {
  const inputSource = compactSource(
    readSource("src/components/ui/text-field/input.tsx"),
  )
  const passwordSource = compactSource(
    readSource("src/components/ui/text-field/password-input.tsx"),
  )

  assert.match(inputSource, /<input[^>]*disabled=\{disabled\}[^>]*>/)
  assert.match(inputSource, /<ClearButton inputRef=\{inputRef\} disabled=\{disabled\} \/>/)
  assert.match(passwordSource, /<input[^>]*disabled=\{disabled\}[^>]*>/)
  assert.match(
    passwordSource,
    /data-slot="password-toggle"[^>]*disabled=\{disabled\}/,
  )
  assert.match(
    passwordSource,
    /<ClearButton inputRef=\{inputRef\} disabled=\{disabled\} \/>/,
  )
})

test("the admin shell has five fixed destinations, current-page semantics, and logout", () => {
  const source = readSource("src/features/admin/shared/components/admin-shell.tsx")

  for (const route of [
    "adminHome",
    "adminUsers",
    "adminReports",
    "adminInquiries",
    "adminKnowledge",
  ]) {
    assert.match(source, new RegExp(`routes\\.${route}\\(\\)`))
  }
  assert.match(source, /messages\.admin\.navigation\.operations/)
  assert.match(source, /messages\.admin\.navigation\.review/)
  assert.doesNotMatch(source, /routes\.adminLogin\(\)/)
  assert.match(source, /aria-current=\{isCurrent \? "page" : undefined\}/)
  assert.match(source, /<LogoutButton \/>/)
})

test("the admin shell fixes the sidebar at 240px and centers bounded content", () => {
  const source = compactSource(
    readSource("src/features/admin/shared/components/admin-shell.tsx"),
  )
  const asideMatch = source.match(/<aside className="([^"]+)">/)
  const contentMatch = source.match(
    /<main className="([^"]+)">\s*<div className="([^"]+)">\s*\{children\}\s*<\/div>\s*<\/main>/,
  )

  assert.ok(asideMatch, "AdminShell must render a classed sidebar")
  const asideClasses = asideMatch[1].split(/\s+/)
  assert.deepEqual(
    asideClasses.filter((className) => className.startsWith("w-")),
    ["w-[240px]"],
  )
  assert.ok(asideClasses.includes("shrink-0"))

  assert.ok(contentMatch, "fluid main must wrap children in a content container")
  const mainClasses = contentMatch[1].split(/\s+/)
  const contentClasses = contentMatch[2].split(/\s+/)
  assert.ok(mainClasses.includes("min-w-0"))
  assert.ok(mainClasses.includes("flex-1"))
  assert.ok(contentClasses.includes("mx-auto"))
  assert.ok(contentClasses.includes("w-full"))
  assert.ok(contentClasses.includes("max-w-[1440px]"))
})

test("ConfirmDialog can disable confirmation without making the prop required", () => {
  const source = readSource("src/components/ui/confirm-dialog.tsx")

  assert.match(source, /confirmDisabled\?: boolean/)
  assert.match(source, /disabled=\{confirmDisabled\}/)
})

test("admin dashboard overview owns one query, accessible charts, and cached retry", () => {
  assertAdminStatsOverviewContract({
    apiSource: readSource("src/features/admin/dashboard/api/admin-stats-api.ts"),
    hookSource: readSource("src/features/admin/dashboard/hooks/use-admin-stats.ts"),
    keysSource: readSource("src/features/admin/dashboard/lib/admin-stats-keys.ts"),
    componentSource: readSource(
      "src/features/admin/dashboard/components/admin-dashboard-page.tsx",
    ),
  })
})

test("each admin user API function owns its exact method, endpoint, and backend DTO", () => {
  const source = readSource("src/features/admin/users/api/admin-users-api.ts")
  const compact = compactSource(source)
  const listSource = compactSource(asyncFunctionSource(source, "getAdminUsers"))
  const detailSource = compactSource(asyncFunctionSource(source, "getAdminUser"))
  const sanctionSource = compactSource(
    asyncFunctionSource(source, "createAdminUserSanction"),
  )
  const activateSource = compactSource(
    asyncFunctionSource(source, "activateAdminUser"),
  )

  assert.match(
    listSource,
    /apiClient\.get<CursorPage<AdminUserItem>>/,
  )
  assert.match(listSource, /"\/api\/v1\/admin\/users"/)
  assert.match(
    listSource,
    /params: compactQuery\(\{ status: params\.status, q: params\.q, cursor: params\.cursor, size: params\.size,? \}\)/,
  )
  assert.match(detailSource, /apiClient\.get<AdminUserDetailResponse>/)
  assert.match(detailSource, /`\/api\/v1\/admin\/users\/\$\{userId\}`/)
  assert.match(
    sanctionSource,
    /apiClient\.post<CreateSanctionResponse>/,
  )
  assert.match(sanctionSource, /`\/api\/v1\/admin\/users\/\$\{userId\}\/sanctions`/)
  assert.match(sanctionSource, /body,? \)/)
  assert.match(activateSource, /apiClient\.post/)
  assert.match(activateSource, /`\/api\/v1\/admin\/users\/\$\{userId\}\/activate`/)
  assert.equal((source.match(/apiClient\.get/g) ?? []).length, 2)
  assert.equal((source.match(/apiClient\.post/g) ?? []).length, 2)
  assert.doesNotMatch(source, /apiClient\.patch|\/role\b/)
  assert.match(
    compact,
    /type UserGrade = "bronze" \| "silver" \| "gold" \| "platinum" \| "diamond"/,
  )
  assert.match(compact, /type AuthProvider = "email" \| "google" \| "kakao"/)
})

test("admin user hooks preserve cursor semantics and invalidate lists plus exact detail", () => {
  const source = readSource("src/features/admin/users/hooks/use-admin-users.ts")
  const compact = compactSource(source)

  assert.match(source, /useInfiniteQuery/)
  assert.match(source, /queryKey:\s*adminUserKeys\.list\(\{ status, q, size \}\)/)
  assert.match(
    compact,
    /queryFn: \(\{ pageParam \}\) => getAdminUsers\(\{ status, q, cursor: pageParam, size \}\)/,
  )
  assert.match(source, /initialPageParam:\s*null as string \| null/)
  assert.match(source, /getNextPageParam:\s*\(page\) => page\.nextCursor/)
  assert.match(source, /queryKey:\s*adminUserKeys\.detail\(userId\)/)
  assert.match(source, /queryFn:\s*\(\) => getAdminUser\(userId\)/)
  assert.match(
    compact,
    /invalidateQueries\(\{ queryKey: adminUserKeys\.lists\(\) \}\)/,
  )
  assert.match(
    compact,
    /invalidateQueries\(\{ queryKey: adminUserKeys\.detail\(userId\), exact: true,? \}\)/,
  )

  for (const [hookName, apiName] of [
    ["useCreateAdminUserSanction", "createAdminUserSanction"],
    ["useActivateAdminUser", "activateAdminUser"],
  ]) {
    assert.match(source, new RegExp(`function ${hookName}\\(userId: number\\)`))
    assert.match(source, new RegExp(`mutationFn:[^\n]*${apiName}\\(userId`))
  }
})

test("sanction success invalidates user records and every overview KPI range", () => {
  const source = readSource("src/features/admin/users/hooks/use-admin-users.ts")

  assertAdminSanctionStatsInvalidation(source)

  const wrongKeyMutant = source.replace(
    "adminStatsKeys.overview",
    "adminStatsKeys.all",
  )
  const exactOverviewMutant = source.replace(
    "queryKey: adminStatsKeys.overview,\n    })",
    "queryKey: adminStatsKeys.overview,\n      exact: true,\n    })",
  )
  const staleStatsMutant = source.replace(
    "onSuccess: () => invalidateAdminSanctionQueries(queryClient, userId)",
    "onSuccess: () => invalidateAdminUserQueries(queryClient, userId)",
  )
  const staleActivationStatsMutant = source.replace(
    "queryClient.invalidateQueries({\n          queryKey: adminStatsKeys.overview,\n        }),",
    "",
  )

  for (const mutant of [
    wrongKeyMutant,
    exactOverviewMutant,
    staleStatsMutant,
    staleActivationStatsMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminSanctionStatsInvalidation(mutant))
  }
})

test("admin users list debounces raw q for 300ms and owns every cursor-table state", () => {
  const source = readSource(
    "src/features/admin/users/components/admin-users-page.tsx",
  )
  const pageSource = readSource("src/app/admin/(protected)/users/page.tsx")

  assert.match(source, /const \[q, setQ\] = React\.useState\(""\)/)
  assert.match(source, /useDebouncedValue\(q, 300\)/)
  assert.match(
    compactSource(source),
    /useAdminUsers\(\{ status, q: debouncedQ, size: 20 \}\)/,
  )
  assert.match(source, /value=\{q\}/)
  assert.match(source, /<label[^>]*htmlFor="admin-user-search"/)
  assert.match(source, /<label[^>]*htmlFor="admin-user-status"/)
  assert.match(source, /<table/)
  assert.match(source, /<thead/)
  assert.ok((source.match(/<th scope="col"/g) ?? []).length >= 8)
  assert.match(source, /routes\.adminUserDetail\(user\.userId\)/)
  assert.match(source, /focus-visible:/)
  assert.match(source, /usersQuery\.isPending/)
  assert.match(source, /usersQuery\.isError/)
  assert.match(source, /onRetry=\{\(\) => void usersQuery\.refetch\(\)\}/)
  assert.match(source, /users\.length === 0/)
  assert.match(source, /usersQuery\.hasNextPage/)
  assert.match(source, /usersQuery\.isFetchingNextPage/)
  assert.match(source, /messages\.admin\.common\.loadMore/)
  assert.match(source, /messages\.admin\.common\.loading/)
  assert.match(source, /timeZone: "Asia\/Seoul"/)
  assert.match(pageSource, /<AdminUsersPage \/>/)
})

test("admin users retries one failed cursor without racing another fetch", () => {
  const source = readSource(
    "src/features/admin/users/components/admin-users-page.tsx",
  )

  assertAdminUserCursorRetry(source)

  const refetchMutant = source.replace(
    "usersQuery.fetchNextPage({ cancelRefetch: false })",
    "usersQuery.refetch()",
  )
  const cancellationMutant = source.replace(
    "usersQuery.fetchNextPage({ cancelRefetch: false })",
    "usersQuery.fetchNextPage({ cancelRefetch: true })",
  )
  const raceMutant = source.replace(
    "disabled={usersQuery.isFetching}",
    "disabled={usersQuery.isFetchingNextPage}",
  )
  const duplicateErrorMutant = source.replace(
    "usersQuery.isError && !usersQuery.isFetchNextPageError",
    "usersQuery.isError",
  )

  for (const mutant of [
    refetchMutant,
    cancellationMutant,
    raceMutant,
    duplicateErrorMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminUserCursorRetry(mutant))
  }
})

test("admin user detail route rejects invalid query and remounts drafts per user", () => {
  const source = readSource("src/app/admin/(protected)/users/detail/page.tsx")
  const parseIndex = source.indexOf(
    'parsePositiveInteger(searchParams.get("userId"))',
  )
  const invalidIndex = source.indexOf("if (userId === null)")
  const detailIndex = source.indexOf("<AdminUserDetailPage")

  assert.ok(parseIndex >= 0)
  assert.ok(invalidIndex > parseIndex)
  assert.ok(detailIndex > invalidIndex)
  assert.match(source, /<AdminAsyncState kind="empty"/)
  assert.match(source, /<React\.Suspense/)
  assert.match(source, /fallback=\{<AdminAsyncState kind="loading" \/>\}/)
  assertAdminUserDetailRemountsByUserId(source)

  const carryoverMutant = source.replace(" key={userId}", "")
  assert.notEqual(carryoverMutant, source)
  assert.throws(() => assertAdminUserDetailRemountsByUserId(carryoverMutant))
})

test("sanction confirmation synchronously rejects duplicate same-tick mutation", () => {
  const source = readSource(
    "src/features/admin/users/components/admin-user-detail-page.tsx",
  )

  assertSanctionConfirmationLatch(source)

  const unguardedMutant = source.replace(
    "if (!pendingSanction || sanctionConfirmLatch.current) return",
    "if (!pendingSanction) return",
  )
  const duplicateMutateMutant = source.replace(
    "sanctionMutation.mutate(pendingSanction, {",
    "sanctionMutation.mutate(pendingSanction, {})\n    sanctionMutation.mutate(pendingSanction, {",
  )

  for (const mutant of [unguardedMutant, duplicateMutateMutant]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertSanctionConfirmationLatch(mutant))
  }
})

test("activation confirmation synchronously rejects duplicate same-tick mutation", () => {
  const source = readSource(
    "src/features/admin/users/components/admin-user-detail-page.tsx",
  )

  assertActivationConfirmationLatch(source)

  const unguardedMutant = source.replace(
    "if (activateConfirmLatch.current) return",
    "if (false) return",
  )
  const duplicateMutateMutant = source.replace(
    "activateMutation.mutate(undefined, {",
    "activateMutation.mutate(undefined, {})\n    activateMutation.mutate(undefined, {",
  )

  for (const mutant of [unguardedMutant, duplicateMutateMutant]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertActivationConfirmationLatch(mutant))
  }
})

test("admin user detail renders backend fields and pending-safe adjacent mutations", () => {
  const source = readSource(
    "src/features/admin/users/components/admin-user-detail-page.tsx",
  )

  for (const field of [
    "user.email",
    "user.nickname",
    "user.role",
    "user.status",
    "user.grade",
    "user.provider",
    "user.lastActiveAt",
    "user.birthDate",
    "user.gender",
    "user.nationality",
    "user.profileImageUrl",
    "activity.questionCount",
    "activity.answerCount",
    "activity.acceptedCount",
    "activity.reportedCount",
    "report.reportId",
    "report.reason",
    "report.status",
    "report.reporterId",
    "report.reporterNickname",
    "report.messageId",
    "report.detail",
    "report.createdAt",
    "sanction.sanctionId",
    "sanction.type",
    "sanction.reason",
    "sanction.createdAt",
    "sanction.createdBy",
    "sanction.endsAt",
    "sanction.releasedAt",
    "sanction.releasedBy",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(field)))
  }

  assert.match(source, /detailQuery\.isPending/)
  assert.match(source, /detailQuery\.isError/)
  assert.match(source, /onRetry=\{\(\) => void detailQuery\.refetch\(\)\}/)
  assert.match(source, /validateSanctionDraft\(/)
  assert.match(source, /maxLength=\{500\}/)
  assert.match(source, /type="datetime-local"/)
  assert.match(source, /sanctionMutation\.isError/)
  assert.match(source, /getApiErrorMessage\(sanctionMutation\.error/)
  assert.match(source, /activateMutation\.isError/)
  assert.match(source, /getApiErrorMessage\(activateMutation\.error/)
  assert.ok((source.match(/role="alert"/g) ?? []).length >= 2)
  assert.match(source, /messages\.admin\.users\.activationScopeNotice/)
  assert.match(source, /timeZone: "Asia\/Seoul"/)
  assert.match(
    compactSource(source),
    /onChange=\{\(event\) => \{ setSanctionType\(event\.target\.value as SanctionType\) setInvalidField\(null\) \}\}/,
  )
  assert.equal((source.match(/<ConfirmDialog/g) ?? []).length, 2)
  assert.doesNotMatch(source, /apiClient|\/role\b|changeRole|patch\(/i)
})

test("each admin report API owns its exact backend DTO, filters, method, and endpoint", () => {
  const source = readSource("src/features/admin/reports/api/admin-reports-api.ts")

  assertAdminReportDtoContracts(source)
  assertAdminReportApiBindings(source)

  const swappedEndpointMutant = swapFirst(
    source,
    "/confirm",
    "/dismiss",
  )
  const droppedFilterMutant = source.replace(
    "decision: params.decision,",
    "",
  )
  const nonNullableUserMutant = source.replace(
    "reportedUser: AdminReportUserSummary | null",
    "reportedUser: AdminReportUserSummary",
  )

  assert.throws(() => assertAdminReportApiBindings(swappedEndpointMutant))
  assert.notEqual(droppedFilterMutant, source)
  assert.throws(() => assertAdminReportApiBindings(droppedFilterMutant))
  assert.notEqual(nonNullableUserMutant, source)
  assert.throws(() => assertAdminReportDtoContracts(nonNullableUserMutant))
})

test("admin report hooks preserve cursor filters and converge every decision cache", () => {
  const source = readSource("src/features/admin/reports/hooks/use-admin-reports.ts")

  assertAdminReportHooks(source)

  const wrongStatsMutant = source.replace(
    "adminStatsKeys.overview",
    "adminStatsKeys.all",
  )
  const exactStatsMutant = source.replace(
    "queryKey: adminStatsKeys.overview,\n    })",
    "queryKey: adminStatsKeys.overview,\n      exact: true,\n    })",
  )
  const successOnlyMutant = source.replace(
    "onSettled: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
    "onSuccess: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
  )
  const staleUserMutant = source.replace(
    "onSettled: () => invalidateAdminReportDismissalQueries(queryClient, reportId, reportedUserId)",
    "onSettled: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
  )

  for (const mutant of [wrongStatsMutant, exactStatsMutant, successOnlyMutant, staleUserMutant]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminReportHooks(mutant))
  }
})

test("admin reports list owns three filters, nullable users, table states, and detail links", () => {
  const source = readSource(
    "src/features/admin/reports/components/admin-reports-page.tsx",
  )
  const pageSource = readSource("src/app/admin/(protected)/reports/page.tsx")
  const compact = compactSource(source)

  assert.match(source, /const \[status, setStatus\] = React\.useState<ReportStatus \| "">\(""\)/)
  assert.match(
    source,
    /const \[aiReviewState, setAiReviewState\] = React\.useState<ReportAiReviewState \| "">\(""\)/,
  )
  assert.match(
    source,
    /const \[decision, setDecision\] = React\.useState<AdminReportDecision \| "">\(""\)/,
  )
  assert.match(
    compact,
    /useAdminReports\(\{ status, aiReviewState, decision, size: 20 \}\)/,
  )
  for (const id of [
    "admin-report-status",
    "admin-report-ai-state",
    "admin-report-decision",
  ]) {
    assert.match(source, new RegExp(`<label[^>]*htmlFor="${id}"`))
    assert.match(source, new RegExp(`<select[^>]*id="${id}"`))
  }
  for (const value of [
    "pending",
    "ai_reviewed",
    "confirmed",
    "dismissed",
    "processing",
    "retry",
    "completed",
    "cancelled",
    "dead",
    "suspend",
    "hold",
    "normal",
  ]) {
    assert.match(source, new RegExp(`<option value="${value}">`))
  }
  assert.match(source, /report\.reportedUser/)
  assert.match(source, /messages\.admin\.reports\.missingReportedUser/)
  assert.match(source, /report\.target\.deleted/)
  assert.match(source, /messages\.admin\.reports\.deleted/)
  assert.match(source, /timeZone: "Asia\/Seoul"/)
  assert.match(source, /routes\.adminReportDetail\(report\.reportId\)/)
  assert.match(source, /<table/)
  assert.match(source, /reportsQuery\.isPending/)
  assert.match(source, /reportsQuery\.isError/)
  assert.match(source, /onRetry=\{\(\) => void reportsQuery\.refetch\(\)\}/)
  assert.match(source, /reports\.length === 0/)
  assert.match(source, /reportsQuery\.isFetchingNextPage/)
  assert.match(source, /messages\.admin\.common\.loadMore/)
  assert.match(source, /messages\.admin\.common\.loading/)
  assert.match(pageSource, /<AdminReportsPage \/>/)
})

test("admin reports retry one failed cursor without cancelling another fetch", () => {
  const source = readSource(
    "src/features/admin/reports/components/admin-reports-page.tsx",
  )

  assertAdminReportCursorRetry(source)

  const refetchMutant = source.replace(
    "reportsQuery.fetchNextPage({ cancelRefetch: false })",
    "reportsQuery.refetch()",
  )
  const cancellationMutant = source.replace(
    "reportsQuery.fetchNextPage({ cancelRefetch: false })",
    "reportsQuery.fetchNextPage({ cancelRefetch: true })",
  )
  const raceMutant = source.replace(
    "disabled={reportsQuery.isFetching}",
    "disabled={reportsQuery.isFetchingNextPage}",
  )
  const duplicateErrorMutant = source.replace(
    "reportsQuery.isError && !reportsQuery.isFetchNextPageError",
    "reportsQuery.isError",
  )

  for (const mutant of [
    refetchMutant,
    cancellationMutant,
    raceMutant,
    duplicateErrorMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminReportCursorRetry(mutant))
  }
})

test("admin report detail route validates and keys the fixed query before mounting data", () => {
  const source = readSource("src/app/admin/(protected)/reports/detail/page.tsx")
  const parseIndex = source.indexOf(
    'parsePositiveInteger(searchParams.get("reportId"))',
  )
  const invalidIndex = source.indexOf("if (reportId === null)")
  const detailIndex = source.indexOf("<AdminReportDetailPage")

  assert.ok(parseIndex >= 0)
  assert.ok(invalidIndex > parseIndex)
  assert.ok(detailIndex > invalidIndex)
  assert.match(source, /<AdminAsyncState kind="empty"/)
  assert.match(source, /<React\.Suspense/)
  assert.match(source, /fallback=\{<AdminAsyncState kind="loading" \/>\}/)
  assertAdminReportDetailRemountsByReportId(source)

  const carryoverMutant = source.replace(" key={reportId}", "")
  assert.notEqual(carryoverMutant, source)
  assert.throws(() => assertAdminReportDetailRemountsByReportId(carryoverMutant))
})

test("admin report detail safely renders every backend field and nullable relation", () => {
  const source = readSource(
    "src/features/admin/reports/components/admin-report-detail-page.tsx",
  )

  for (const field of [
    "report.reportId",
    "target.type",
    "target.id",
    "target.deleted",
    "reporter.userId",
    "reporter.nickname",
    "reportedUser.userId",
    "reportedUser.nickname",
    "report.reason",
    "report.detail",
    "report.status",
    "report.createdAt",
    "contextSnapshot",
    "report.contextHash",
    "ai.reviewState",
    "ai.recommendation",
    "ai.reason",
    "ai.confidence",
    "ai.modelVersion",
    "ai.policyVersion",
    "ai.reviewedAt",
    "ai.decision",
    "ai.policySetHash",
    "ai.result",
    "ai.lastErrorCode",
    "resolution.decision",
    "resolution.resolvedBy.userId",
    "resolution.resolvedBy.nickname",
    "resolution.resolvedAt",
    "sanction.sanctionId",
    "sanction.decisionSource",
    "sanction.type",
    "sanction.reason",
    "sanction.admin",
    "sanction.startsAt",
    "sanction.endsAt",
    "sanction.releasedAt",
    "sanction.releasedBy",
    "sanction.createdAt",
  ]) {
    assert.match(source, new RegExp(escapeRegExp(field)))
  }
  assert.match(source, /JSON\.stringify\(contextSnapshot, null, 2\)/)
  assert.match(source, /JSON\.stringify\(ai\.result, null, 2\)/)
  assert.match(source, /messages\.admin\.reports\.missingReportedUser/)
  assert.match(source, /messages\.admin\.reports\.deleted/)
  assert.match(source, /timeZone: "Asia\/Seoul"/)
  assert.match(source, /messages\.admin\.reports\.confirmNotice/)
  assert.match(source, /messages\.admin\.reports\.resolution/)
  assert.match(source, /detailQuery\.isPending/)
  assert.match(source, /detailQuery\.isError/)
  assert.match(source, /onRetry=\{\(\) => void detailQuery\.refetch\(\)\}/)
  assert.match(source, /getApiErrorMessage\(/)
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/)

  for (const file of sourceFiles(path.join(repoRoot, "src/features/admin"))) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /dangerouslySetInnerHTML/)
  }

  const unsafeJsonMutant = source.replace(
    "JSON.stringify(contextSnapshot, null, 2)",
    "String(contextSnapshot)",
  )
  const missingFallbackMutant = source.replace(
    "messages.admin.reports.missingReportedUser",
    '"—"',
  )
  const htmlInjectionMutant = `${source}\nconst dangerouslySetInnerHTML = true\n`

  assert.notEqual(unsafeJsonMutant, source)
  assert.throws(() =>
    assert.match(unsafeJsonMutant, /JSON\.stringify\(contextSnapshot, null, 2\)/),
  )
  assert.notEqual(missingFallbackMutant, source)
  assert.throws(() =>
    assert.match(missingFallbackMutant, /messages\.admin\.reports\.missingReportedUser/),
  )
  assert.throws(() => assert.doesNotMatch(htmlInjectionMutant, /dangerouslySetInnerHTML/))
})

test("admin report detail maps resolution and sanction labels to exact message keys", () => {
  const source = readSource(
    "src/features/admin/reports/components/admin-report-detail-page.tsx",
  )

  assertAdminReportSemanticLabels(source)

  const swappedResolutionMutant = swapFirst(
    source,
    "messages.admin.reports.resolutionDecision",
    "messages.admin.reports.resolvedBy",
  )
  const swappedSanctionMutant = swapFirst(
    source,
    "messages.admin.reports.sanctionSource",
    "messages.admin.reports.sanctionType",
  )
  const hardcodedSanctionMutant = source.replace(
    "{messages.admin.reports.sanctionSource}",
    "source",
  )

  for (const mutant of [
    swappedResolutionMutant,
    swappedSanctionMutant,
    hardcodedSanctionMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminReportSemanticLabels(mutant))
  }
})

test("admin report convergence state keeps every unresolved refetch failure locked", () => {
  const source = readSource(
    "src/features/admin/reports/lib/admin-report-decision-convergence.ts",
  )

  assertAdminReportDecisionConvergenceState(source)

  const failedUnlockMutant = source.replace(
    'return { kind: "retry", reason: state.reason }',
    "return initialAdminReportDecisionConvergenceState",
  )
  const pendingUnlockMutant = source.replace(
    'event.reportStatus === "confirmed" ||\n    event.reportStatus === "dismissed"',
    'event.reportStatus === "confirmed" ||\n    event.reportStatus === "dismissed" ||\n    event.reportStatus === "pending"',
  )
  const earlyConflictCopyMutant = source.replace(
    'return state.kind === "conflict-refreshed"',
    'return state.kind !== "idle"',
  )
  const uncertainRetryMutant = source.replace(
    'if (state.reason === "uncertain") {\n    return initialAdminReportDecisionConvergenceState\n  }',
    'if (state.reason === "uncertain") {\n    return { kind: "retry", reason: state.reason }\n  }',
  )

  for (const [name, mutant] of [
    ["failed unlock", failedUnlockMutant],
    ["pending unlock", pendingUnlockMutant],
    ["early conflict copy", earlyConflictCopyMutant],
    ["uncertain retry", uncertainRetryMutant],
  ]) {
    assert.notEqual(mutant, source, `${name} mutant must change the source`)
    assert.throws(
      () => assertAdminReportDecisionConvergenceState(mutant),
      `${name} mutant must violate the convergence contract`,
    )
  }
})

test("admin report decisions use one detail refetch owner and one synchronous latch", () => {
  const source = readSource(
    "src/features/admin/reports/components/admin-report-detail-page.tsx",
  )
  const hookSource = readSource(
    "src/features/admin/reports/hooks/use-admin-reports.ts",
  )

  assertAdminReportDecisionConvergence(source)
  assertAdminReportHooks(hookSource)
  assert.match(source, /getApiErrorCode\(error\)/)
  assert.match(source, /code === "REPORT_ALREADY_RESOLVED"/)
  assert.match(source, /code === "REPORT_CONCURRENTLY_CHANGED"/)
  assert.match(
    source,
    /const canDecide =\s*report\.status === "pending" \|\| report\.status === "ai_reviewed"/,
  )
  assert.match(source, /\{canDecide \? \(/)

  const unguardedMutant = source.replace(
    'if (!pendingDecision || decisionLatch.current !== "idle") return',
    "if (!pendingDecision) return",
  )
  const duplicateMutateMutant = source.replace(
    "mutation.mutate(undefined, {",
    "mutation.mutate(undefined, {})\n    mutation.mutate(undefined, {",
  )
  const splitBusyMutant = source.replace(
    "    dismissMutation.isPending ||\n",
    "",
  )
  const failedUnlockMutant = source.replace(
    "if (isAdminReportDecisionConvergenceLocked(nextState)) {",
    "if (false) {",
  )
  const duplicateRefetchMutant = source.replace(
    "await detailQuery.refetch({ cancelRefetch: true })",
    "await detailQuery.refetch({ cancelRefetch: true })\n      await detailQuery.refetch({ cancelRefetch: true })",
  )
  const staleInFlightRefetchMutant = source.replace(
    "await detailQuery.refetch({ cancelRefetch: true })",
    "await detailQuery.refetch({ cancelRefetch: false })",
  )
  const earlyConflictCopyMutant = source.replace(
    "shouldShowAdminReportResolvedConflict(convergenceState)",
    'convergenceState.kind !== "idle"',
  )
  const automaticDetailRefetchMutant = hookSource.replace(
    'refetchType: "none",',
    "",
  )
  const trappedRetryMutant = source.replace(
    "        setPendingDecision(null)\n        const reason =",
    "        const reason =",
  )
  const uncertainUnlockMutant = source.replace(
    '              : "uncertain"\n        beginDecisionConvergence(reason)',
    '              : "uncertain"\n        if (reason === "uncertain") {\n          releaseDecisionLock()\n          return\n        }\n        beginDecisionConvergence(reason)',
  )
  const duplicateCachedRetryMutant = source.replace(
    "detailQuery.isError &&\n        !isAdminReportDecisionConvergenceLocked(convergenceState) &&",
    "detailQuery.isError &&",
  )

  for (const mutant of [
    unguardedMutant,
    duplicateMutateMutant,
    splitBusyMutant,
    failedUnlockMutant,
    duplicateRefetchMutant,
    staleInFlightRefetchMutant,
    earlyConflictCopyMutant,
    duplicateCachedRetryMutant,
    trappedRetryMutant,
    uncertainUnlockMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminReportDecisionConvergence(mutant))
  }
  assert.notEqual(automaticDetailRefetchMutant, hookSource)
  assert.throws(() => assertAdminReportHooks(automaticDetailRefetchMutant))
})

test("knowledge candidate admin UI owns API paths, pending defaults, select review, terminal hiding, and 409 convergence", () => {
  assertKnowledgeCandidateContracts({
    apiSource: readSource(
      "src/features/admin/knowledge/api/admin-knowledge-candidates-api.ts",
    ),
    hookSource: readSource(
      "src/features/admin/knowledge/hooks/use-admin-knowledge-candidates.ts",
    ),
    pageSource: readSource(
      "src/features/admin/knowledge/components/admin-knowledge-candidates-page.tsx",
    ),
    routeSource: readSource("src/app/admin/(protected)/knowledge/page.tsx"),
    shellSource: readSource(
      "src/features/admin/shared/components/admin-shell.tsx",
    ),
  })
})

test("each admin inquiry API owns the exact nullable DTO, filters, body, and endpoints", () => {
  const source = readSource(
    "src/features/admin/inquiries/api/admin-inquiries-api.ts",
  )

  assertAdminInquiryApiContracts(source)

  const nonNullableEmailMutant = source.replace(
    "userEmail: string | null",
    "userEmail: string",
  )
  const droppedCursorMutant = source.replace("cursor: params.cursor,", "")
  const droppedBodyMutant = source.replace(", body)", ")")
  const wrongMethodMutant = source.replace(
    "apiClient.post(`",
    "apiClient.get(`",
  )
  const wrongDetailEndpointMutant = source.replace(
    '`/api/v1/admin/inquiries/${inquiryId}`',
    '`/api/v1/admin/inquiry/${inquiryId}`',
  )
  const nullableDetailMutant = source.replace(
    "): Promise<AdminInquiryItem> {",
    "): Promise<AdminInquiryItem | null> {",
  )
  const droppedSignalMutant = source.replace("      signal,\n", "")
  const droppedDetailSignalMutant = source.replace(
    "    { signal },\n",
    "    {},\n",
  )

  for (const mutant of [
    nonNullableEmailMutant,
    droppedCursorMutant,
    droppedBodyMutant,
    wrongMethodMutant,
    wrongDetailEndpointMutant,
    nullableDetailMutant,
    droppedSignalMutant,
    droppedDetailSignalMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryApiContracts(mutant))
  }
})

test("admin inquiry hooks and mutation cache own durable settled convergence", () => {
  const source = readSource(
    "src/features/admin/inquiries/hooks/use-admin-inquiries.ts",
  )
  const lifecycleSource = readSource(
    "src/features/admin/inquiries/lib/admin-inquiry-answer-lifecycle.ts",
  )
  const sessionSource = readSource(
    "src/features/session/lib/session-cache.ts",
  )

  assertAdminInquiryHooks(source)
  assertAdminInquiryAnswerLifecycle(lifecycleSource)
  assertAdminInquirySessionAbortBoundary(sessionSource)

  const automaticRefetchMutant = source.replace('refetchType: "none",', "")
  const wrongPrefixMutant = source.replace(
    "queryKey: adminInquiryKeys.all",
    "queryKey: adminInquiryKeys.lists()",
  )
  const droppedStatusKeyMutant = source.replace("{ status, size },", "{ size },")
  const droppedDetailSignalMutant = source.replace(
    "getAdminInquiry(inquiryId, signal)",
    "getAdminInquiry(inquiryId)",
  )
  const droppedActiveRefetchMutant = source.replace(
    "refetchActiveLists: () => refetchActiveAdminInquiryLists(queryClient)",
    "refetchActiveLists: async () => undefined",
  )

  for (const mutant of [
    automaticRefetchMutant,
    wrongPrefixMutant,
    droppedStatusKeyMutant,
    droppedDetailSignalMutant,
    droppedActiveRefetchMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryHooks(mutant))
  }

  const successOnlyMutant = lifecycleSource.replace("onSettled:", "onSuccess:")
  const droppedOperationGuardMutant = lifecycleSource.replaceAll(
    "current?.operationId !== execution.operationId",
    "false",
  )
  const duplicateActiveRefetchMutant = lifecycleSource.replace(
    "await dependencies.refetchActiveLists()",
    "await dependencies.refetchActiveLists()\n    await dependencies.refetchActiveLists()",
  )
  const droppedSnapshotMutant = lifecycleSource.replace(
    'canonicalInquiry.status === "answered" ? canonicalInquiry : null',
    "null",
  )
  const droppedAbortMutant = lifecycleSource.replace(
    "previous?.controller.abort()",
    "previous?.controller",
  )
  const staleInFlightMutant = lifecycleSource.replace(
    "{ cancelRefetch: true, throwOnError: true }",
    "{ cancelRefetch: false, throwOnError: true }",
  )
  const inactiveListMutant = lifecycleSource.replace(
    '{ queryKey: adminInquiryListKey, type: "active" }',
    '{ queryKey: adminInquiryListKey, type: "all" }',
  )
  const wrongListPrefixMutant = lifecycleSource.replace(
    '["admin", "inquiries", "list"] as const',
    '["admin", "inquiries"] as const',
  )
  const droppedCanonicalSignalMutant = lifecycleSource.replace(
    "{ signal: controller.signal }",
    "{}",
  )
  const droppedGenerationGuardMutant = lifecycleSource.replaceAll(
    "isSessionGenerationCurrent(queryClient, execution.sessionGeneration)",
    "true",
  )
  const droppedControllerGenerationMutant = lifecycleSource.replace(
    "sessionGeneration: execution.sessionGeneration,\n    controller,",
    "controller,",
  )
  const droppedSessionAbortListenerMutant = lifecycleSource.replace(
    'sessionSignal.addEventListener("abort", abortForSessionReset, {',
    'sessionSignal.removeEventListener("abort", abortForSessionReset, {',
  )
  const droppedCurrentExecutionChecksMutant = lifecycleSource.replaceAll(
    "!isAdminInquiryAnswerExecutionCurrent(queryClient, execution)",
    "false",
  )

  for (const mutant of [
    successOnlyMutant,
    droppedOperationGuardMutant,
    duplicateActiveRefetchMutant,
    droppedSnapshotMutant,
    droppedAbortMutant,
    staleInFlightMutant,
    inactiveListMutant,
    wrongListPrefixMutant,
    droppedCanonicalSignalMutant,
    droppedGenerationGuardMutant,
    droppedControllerGenerationMutant,
    droppedSessionAbortListenerMutant,
    droppedCurrentExecutionChecksMutant,
  ]) {
    assert.notEqual(mutant, lifecycleSource)
    assert.throws(() => assertAdminInquiryAnswerLifecycle(mutant))
  }

  const droppedSessionRotationMutant = sessionSource.replace(
    "  rotateSessionAbortSignal(queryClient)\n",
    "",
  )
  assert.notEqual(droppedSessionRotationMutant, sessionSource)
  assert.throws(() =>
    assertAdminInquirySessionAbortBoundary(droppedSessionRotationMutant),
  )
})

test("admin inquiry answer convergence keeps every failed canonical refresh locked", () => {
  const source = readSource(
    "src/features/admin/inquiries/lib/admin-inquiry.ts",
  )

  assertAdminInquiryAnswerConvergenceState(source)

  const failedUnlockMutant = source.replace(
    'return { kind: "retry", reason: state.reason }',
    "return initialAdminInquiryAnswerConvergenceState",
  )
  const uncertainRetryMutant = source.replace(
    'if (state.reason === "uncertain") {\n    return initialAdminInquiryAnswerConvergenceState\n  }',
    'if (state.reason === "uncertain") {\n    return { kind: "retry", reason: state.reason }\n  }',
  )
  const pendingUnlockMutant = source.replace(
    'if (event.inquiryStatus !== "answered") {',
    'if (false) {',
  )
  const mutationUnlockMutant = source.replaceAll(
    'state.kind === "mutation" ||\n',
    "",
  )
  const collapsedRetryMutant = source.replace(
    "(!targetIsVisible || targetInquiryId !== selectedInquiryId)",
    "targetInquiryId !== selectedInquiryId",
  )
  const hiddenExpandedLoadingMutant = source.replace(
    'state.kind === "mutation" || state.kind === "refreshing"',
    'state.kind === "mutation"',
  )

  for (const mutant of [
    failedUnlockMutant,
    uncertainRetryMutant,
    pendingUnlockMutant,
    mutationUnlockMutant,
    collapsedRetryMutant,
    hiddenExpandedLoadingMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryAnswerConvergenceState(mutant))
  }
})

test("admin inquiries preserve isolated row state and converge through canonical detail", () => {
  const source = readSource(
    "src/features/admin/inquiries/components/admin-inquiries-page.tsx",
  )
  const pageSource = readSource(
    "src/app/admin/(protected)/inquiries/page.tsx",
  )

  assertAdminInquiryExpansion(source)
  assertAdminInquiryAnswerConvergence(source)
  assert.match(source, /useAdminInquiries\(\{ status, size: 20 \}\)/)
  assert.match(source, /inquiriesQuery\.isPending/)
  assert.match(source, /inquiriesQuery\.isError/)
  assert.match(source, /inquiries\.length === 0/)
  assert.match(source, /inquiriesQuery\.isFetchingNextPage/)
  assert.match(source, /timeZone: "Asia\/Seoul"/)
  assert.match(
    source,
    /<option value="pending">\{messages\.admin\.inquiries\.pending\}<\/option>/,
  )
  assert.match(
    source,
    /<option value="answered">\{messages\.admin\.inquiries\.answered\}<\/option>/,
  )
  assert.match(source, /const displayedInquiry = lifecycle\?\.snapshot \?\? inquiry/)
  assert.match(source, /inquiry=\{displayedInquiry\}/)
  assert.match(pageSource, /<AdminInquiriesPage \/>/)

  const missingExpandedMutant = source.replace(" aria-expanded={isExpanded}", "")
  const missingControlsMutant = source.replace(
    " aria-controls={`admin-inquiry-detail-${inquiry.inquiryId}`}",
    "",
  )
  const rowClickMutant = source.replace("<tr>", '<tr onClick={() => undefined}>')
  const sharedDraftMutant = source.replace(" key={inquiry.inquiryId}", "")
  const missingFallbackMutant = source.replace(
    "inquiry.userEmail ?? messages.admin.inquiries.missingUser",
    'inquiry.userEmail ?? "—"',
  )
  const answeredFormMutant = source.replace(
    'inquiry.status === "answered"',
    'inquiry.status === "pending"',
  )
  const droppedLifecycleSubscriptionMutant = source.replace(
    "useAdminInquiryAnswerLifecycles()",
    "{ nextOperationId: 1, records: {} }",
  )
  const duplicateMutationMutant = source.replace(
    "answerMutation.submit({",
    "answerMutation.submit({})\n    answerMutation.submit({",
  )
  const duplicateRetryMutant = source.replace(
    "onRetry={retryAnswerConvergence}",
    "onRetry={retryAnswerConvergence} />\n        <AdminAsyncState kind=\"error\" onRetry={retryAnswerConvergence}",
  )
  const staleSelectionMutant = source.replace(
    "if (previousVisibleInquiryIds !== visibleInquiryIds) {",
    "if (false) {",
  )
  const swappedSubjectMutant = swapFirst(
    source,
    "messages.admin.inquiries.subject",
    "messages.admin.inquiries.content",
  )
  const unlockedMutationMutant = source.replace(
    "isAdminInquiryAnswerConvergenceLocked(record.state)",
    'record.state.kind === "refreshing"',
  )
  const droppedResolvedSnapshotMutant = source.replace(
    "resolvedAnswer !== null &&",
    "false &&",
  )
  const droppedDetachedRetryMutant = source.replace(
    "showPageConvergence &&",
    "false &&",
  )
  const droppedAnsweredConvergenceMutant = source.replace(
    "        {convergenceView}\n        <AdminInquiryAnsweredDetails",
    "        <AdminInquiryAnsweredDetails",
  )

  for (const mutant of [
    missingExpandedMutant,
    missingControlsMutant,
    rowClickMutant,
    sharedDraftMutant,
    missingFallbackMutant,
    answeredFormMutant,
    droppedLifecycleSubscriptionMutant,
    duplicateMutationMutant,
    duplicateRetryMutant,
    staleSelectionMutant,
    swappedSubjectMutant,
    unlockedMutationMutant,
    droppedResolvedSnapshotMutant,
    droppedDetachedRetryMutant,
    droppedAnsweredConvergenceMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => {
      assertAdminInquiryExpansion(mutant)
      assertAdminInquiryAnswerConvergence(mutant)
    })
  }
})

test("admin inquiry cursor failures retry one page without a second generic error", () => {
  const source = readSource(
    "src/features/admin/inquiries/components/admin-inquiries-page.tsx",
  )

  assertAdminInquiryCursorRetry(source)

  const refetchMutant = source.replace(
    "inquiriesQuery.fetchNextPage({ cancelRefetch: false })",
    "inquiriesQuery.refetch()",
  )
  const cancellationMutant = source.replace(
    "inquiriesQuery.fetchNextPage({ cancelRefetch: false })",
    "inquiriesQuery.fetchNextPage({ cancelRefetch: true })",
  )
  const raceMutant = source.replace(
    "disabled={listBusy}",
    "disabled={inquiriesQuery.isFetchingNextPage}",
  )
  const duplicateErrorMutant = source.replace(
    "inquiriesQuery.isError &&\n              !inquiriesQuery.isFetchNextPageError &&\n              !answerBusy",
    "inquiriesQuery.isError",
  )
  const emptyDuplicateErrorMutant = source.replace(
    "inquiriesQuery.isError &&\n          inquiries.length === 0 &&\n          !answerBusy",
    "inquiriesQuery.isError && inquiries.length === 0",
  )

  for (const mutant of [
    refetchMutant,
    cancellationMutant,
    raceMutant,
    duplicateErrorMutant,
    emptyDuplicateErrorMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryCursorRetry(mutant))
  }
})
