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

function assertAdminStatsKeyBindings(keysSource, hookSource) {
  const compactKeys = compactSource(keysSource)

  assert.match(hookSource, /import \{ adminStatsKeys \} from/)
  for (const key of ["users", "content", "reports"]) {
    assert.match(
      compactKeys,
      new RegExp(
        `${key}: \\["admin", "stats", "${key}"\\] as const`,
      ),
    )
    assert.match(
      hookSource,
      new RegExp(`queryKey:\\s*adminStatsKeys\\.${key}`),
    )
  }
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
  for (const key of ["users", "reports"]) {
    assert.match(
      invalidation,
      new RegExp(
        `invalidateQueries\\(\\{ queryKey: adminStatsKeys\\.${key}, exact: true,? \\}\\)`,
      ),
    )
  }
  assert.equal((invalidation.match(/adminStatsKeys\./g) ?? []).length, 2)
  assert.doesNotMatch(invalidation, /adminStatsKeys\.content/)
  assert.match(
    sanctionHook,
    /onSuccess: \(\) => invalidateAdminSanctionQueries\(queryClient, userId\)/,
  )
  assert.match(
    activationHook,
    /onSuccess: \(\) => invalidateAdminUserQueries\(queryClient, userId\)/,
  )
  assert.doesNotMatch(
    activationHook,
    /invalidateAdminSanctionQueries|adminStatsKeys/,
  )
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
    /invalidateQueries\(\{ queryKey: adminStatsKeys\.reports, exact: true,? \}\)/,
  )
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
    /state\.reason === "conflict"[\s\S]*return \{ kind: "conflict-refreshed" \}/,
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
  const recovery = compactSource(
    asyncFunctionSource(source, "findAnsweredAdminInquiry"),
  )
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
  assert.match(
    list,
    /apiClient\.get<CursorPage<AdminInquiryItem>>\( "\/api\/v1\/admin\/inquiries", \{ params: compactQuery\(\{ status: params\.status, cursor: params\.cursor, size: params\.size, \}\), \}, \)/,
  )
  assert.match(
    answer,
    /apiClient\.post\(`\/api\/v1\/admin\/inquiries\/\$\{inquiryId\}\/answer`, body\)/,
  )
  assertOrdered(recovery, [
    "let cursor: string | null = null",
    "const seenCursors = new Set<string>()",
    'getAdminInquiries({ status: "answered", cursor, size: 20 })',
    "page.items.find((item) => item.inquiryId === inquiryId)",
    "if (inquiry !== undefined) return inquiry",
    "cursor = page.nextCursor",
    "seenCursors.has(cursor)",
    "seenCursors.add(cursor)",
    "while (cursor !== null)",
    "return null",
  ])
  assert.equal((list.match(/apiClient\.get/g) ?? []).length, 1)
  assert.equal((recovery.match(/getAdminInquiries/g) ?? []).length, 1)
  assert.equal((answer.match(/apiClient\.post/g) ?? []).length, 1)
}

function assertAdminInquiryHooks(source) {
  const compact = compactSource(source)
  const invalidation = compactSource(
    boundedSource(
      source,
      "function invalidateAdminInquiryQueries(",
      "function useAdminInquiries(",
    ),
  )
  const listHook = compactSource(
    boundedSource(
      source,
      "function useAdminInquiries(",
      "function useAnswerAdminInquiry(",
    ),
  )
  const answerHook = compactSource(
    boundedSource(source, "function useAnswerAdminInquiry(", "export {"),
  )

  assert.match(compact, /all: \["admin", "inquiries"\] as const/)
  assert.match(compact, /lists: \(\) => \[\.\.\.adminInquiryKeys\.all, "list"\] as const/)
  assert.match(
    compact,
    /list: \(\{ status, size \}: Omit<AdminInquiriesParams, "cursor">\) => \[ \.\.\.adminInquiryKeys\.lists\(\), \{ status, size \}, \] as const/,
  )
  assert.match(
    invalidation,
    /queryClient\.invalidateQueries\(\{ queryKey: adminInquiryKeys\.all, refetchType: "none", \}\)/,
  )
  assert.match(listHook, /queryKey: adminInquiryKeys\.list\(\{ status, size \}\)/)
  assert.match(
    listHook,
    /getAdminInquiries\(\{ status, cursor: pageParam, size \}\)/,
  )
  assert.match(listHook, /initialPageParam: null as string \| null/)
  assert.match(listHook, /getNextPageParam: \(page\) => page\.nextCursor/)
  assert.match(answerHook, /mutationFn: \(body: AnswerInquiryRequest\) => answerAdminInquiry\(inquiryId, body\)/)
  assert.match(
    answerHook,
    /onSettled: \(\) => invalidateAdminInquiryQueries\(queryClient\)/,
  )
  assert.doesNotMatch(answerHook, /onSuccess:/)
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
    /inquiriesQuery\.isError && !inquiriesQuery\.isFetchNextPageError && answerBusyInquiryId === null && \(/,
  )
  assert.match(
    compact,
    /inquiriesQuery\.isError && inquiries\.length === 0 && answerBusyInquiryId === null \? \(/,
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
  assert.match(
    compact,
    /if \(event\.inquiryStatus === "missing"\) \{ return state\.reason === "uncertain" \? initialAdminInquiryAnswerConvergenceState : \{ kind: "retry", reason: state\.reason \} \}/,
  )
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
    /return state\.kind === "refreshing" \|\| state\.kind === "retry"/,
  )
  assert.match(compact, /return state\.kind === "conflict-refreshed"/)
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
    /const \[resolvedAnswer, setResolvedAnswer\] = React\.useState<AdminInquiryAnswerResolution \| null>\(null\)/,
  )
  assert.match(
    compact,
    /resolvedAnswer !== null && !inquiries\.some\( \(inquiry\) => inquiry\.inquiryId === resolvedAnswer\.inquiry\.inquiryId, \) && \(/,
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
  const compact = compactSource(source)
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
  const refresh = compactSource(
    boundedSource(
      source,
      "const refreshAnswerConvergence = async (",
      "const beginAnswerConvergence = (",
    ),
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

  assert.match(
    source,
    /type AnswerLatchState = "idle" \| "mutation" \| "refreshing" \| "retry"/,
  )
  assert.match(source, /const answerLatch = React\.useRef<AnswerLatchState>\("idle"\)/)
  assert.match(
    source,
    /const \[answerBusyInquiryId, setAnswerBusyInquiryId\] = React\.useState<number \| null>\(null\)/,
  )
  assert.match(
    page,
    /const answerBusy = answerBusyInquiryId !== null \|\| answerMutation\.isPending \|\| isAdminInquiryAnswerConvergenceLocked\(convergenceState\)/,
  )
  assert.equal(
    (refresh.match(/inquiriesQuery\.refetch\(\{ cancelRefetch: true \}\)/g) ?? []).length,
    1,
  )
  assert.match(refresh, /refreshResult\.isError \|\| refreshResult\.data === undefined/)
  assert.match(
    refresh,
    /refreshedInquiry === undefined && status === "pending" \? await findAnsweredAdminInquiry\(targetInquiry\.inquiryId\) : null/,
  )
  assert.match(
    refresh,
    /if \(canonicalInquiry === null \|\| canonicalInquiry === undefined\) \{ nextState = reduceAdminInquiryAnswerConvergence\(refreshingState, \{ type: "refetch-failed", \}\) \}/,
  )
  assert.match(
    refresh,
    /const canonicalInquiry = refreshedInquiry \?\? recoveredInquiry/,
  )
  assert.match(refresh, /inquiryStatus: canonicalInquiry\.status/)
  assert.match(
    refresh,
    /if \(canonicalInquiry\.status === "answered"\) \{ setResolvedAnswer\(\{ inquiry: canonicalInquiry, showConflict: refreshingState\.reason === "conflict", \}\) \}/,
  )
  assertOrdered(refresh, [
    "setConvergenceState(nextState)",
    "if (isAdminInquiryAnswerConvergenceLocked(nextState)) {",
    'answerLatch.current = "retry"',
    "return",
    "releaseAnswerLock()",
  ])
  assert.match(
    retry,
    /answerLatch\.current !== "retry" \|\| convergenceState\.kind !== "retry" \|\| answerTarget === null/,
  )
  assert.match(retry, /type: "retry"/)
  assert.match(retry, /void refreshAnswerConvergence\(refreshingState, answerTarget\)/)
  assertOrdered(formSubmit, [
    "event.preventDefault()",
    "const answer = normalizeInquiryAnswer(draft)",
    "if (answer === null) return",
    "onAnswerSubmit(inquiry, answer)",
  ])
  assertOrdered(submit, [
    'if (answerLatch.current !== "idle") return',
    "setResolvedAnswer(null)",
    "setAnswerTarget(inquiry)",
    "answerMutation.reset()",
    'answerLatch.current = "mutation"',
    "setAnswerBusyInquiryId(inquiry.inquiryId)",
    "answerMutation.mutate({ answer }, {",
    "onSettled: (_data, error) => {",
    "const reason =",
    "beginAnswerConvergence(reason, inquiry)",
  ])
  assert.match(
    submit,
    /const reason = error === null \? "success" : isInquiryAlreadyAnsweredError\(error\) \? "conflict" : "uncertain"/,
  )
  assert.doesNotMatch(submit, /releaseAnswerLock\(\)/)
  assert.equal((submit.match(/answerMutation\.mutate\(/g) ?? []).length, 1)
  assertOrdered(page, [
    'answerLatch.current = "idle"',
    "setAnswerBusyInquiryId(null)",
    "setAnswerTarget(null)",
  ])
  assert.match(
    page,
    /const answerError = answerMutation\.isError && !isInquiryAlreadyAnsweredError\(answerMutation\.error\) && !isAdminInquiryAnswerConvergenceLocked\(convergenceState\) \? getApiErrorMessage\(answerMutation\.error, messages\.admin\.common\.loadError\) : null/,
  )
  assert.match(expanded, /convergenceState\.kind === "retry" && \(/)
  assert.equal(
    (expanded.match(/onRetry=\{onConvergenceRetry\}/g) ?? []).length,
    1,
  )
  assert.match(expanded, /shouldShowAdminInquiryAnsweredConflict\(convergenceState\)/)
  assert.match(
    page,
    /answerTarget !== null && !answerTargetIsVisible && \( convergenceState\.kind === "retry" \? \( <AdminAsyncState kind="error" message=\{messages\.admin\.inquiries\.convergenceError\} onRetry=\{retryAnswerConvergence\}/,
  )
  assert.equal(
    (page.match(/onRetry=\{retryAnswerConvergence\}/g) ?? []).length,
    1,
  )
  assert.match(compact, /getApiErrorCode\(error\) === "INQUIRY_ALREADY_ANSWERED"/)
}

const statsApiBindings = [
  ["getAdminUserStats", "UserStatsResponse", "/api/v1/admin/stats/users"],
  ["getAdminContentStats", "ContentStatsResponse", "/api/v1/admin/stats/content"],
  ["getAdminReportStats", "ReportStatsResponse", "/api/v1/admin/stats/reports"],
]

function assertStatsApiBindings(source) {
  for (const [functionName, responseType, endpoint] of statsApiBindings) {
    const functionSource = compactSource(asyncFunctionSource(source, functionName))

    assert.equal((functionSource.match(/apiClient\.get/g) ?? []).length, 1)
    assert.match(
      functionSource,
      new RegExp(
        `apiClient\\.get<${responseType}>\\(["']${escapeRegExp(endpoint)}["']\\)`,
      ),
    )
  }
}

const dashboardMetricBindings = [
  ["signup", "countFormatter.format(user.signupCount)"],
  ["activeUsers", "countFormatter.format(user.activeUserCount)"],
  ["suspendedUsers", "countFormatter.format(user.suspendedUserCount)"],
  ["pins", "countFormatter.format(content.pinCount)"],
  ["questions", "countFormatter.format(content.questionCount)"],
  ["meetings", "countFormatter.format(content.meetingCount)"],
  ["answers", "countFormatter.format(content.answerCount)"],
  ["acceptedRate", "formatAcceptedRate(content.acceptedRate, language)"],
  ["messages", "countFormatter.format(content.messageCount)"],
  ["reports", "countFormatter.format(reports.reportCount)"],
  ["aiReviewed", "countFormatter.format(reports.aiReviewedCount)"],
  ["confirmed", "countFormatter.format(reports.confirmedCount)"],
  ["dismissed", "countFormatter.format(reports.dismissedCount)"],
  ["sanctions", "countFormatter.format(reports.sanctionCount)"],
]

function assertDashboardMetricBindings(source) {
  assert.equal((source.match(/\{\s*label:/g) ?? []).length, 14)

  for (const [messageKey, valueExpression] of dashboardMetricBindings) {
    assert.match(
      source,
      new RegExp(
        `\\{\\s*label:\\s*messages\\.admin\\.dashboard\\.${messageKey},\\s*` +
          `value:\\s*${escapeRegExp(valueExpression)}\\s*\\}`,
      ),
    )
  }
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

test("the admin shell has four fixed destinations, current-page semantics, and logout", () => {
  const source = readSource("src/features/admin/shared/components/admin-shell.tsx")

  for (const route of ["adminHome", "adminUsers", "adminReports", "adminInquiries"]) {
    assert.match(source, new RegExp(`routes\\.${route}\\(\\)`))
  }
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

test("each admin stats function owns its exact default-range GET endpoint", () => {
  const source = readSource("src/features/admin/dashboard/api/admin-stats-api.ts")
  const endpointLiterals = [...source.matchAll(/["'](\/api\/v1\/admin\/stats\/[^"']+)["']/g)]
    .map((match) => match[1])
    .sort()

  assert.deepEqual(endpointLiterals, [
    "/api/v1/admin/stats/content",
    "/api/v1/admin/stats/reports",
    "/api/v1/admin/stats/users",
  ])
  assert.equal((source.match(/apiClient\.get/g) ?? []).length, 3)
  assert.doesNotMatch(source, /\bparams\s*:|URLSearchParams|compactQuery/)
  assertStatsApiBindings(source)
})

test("admin stats API binding contract rejects a swapped-endpoint mutant", () => {
  const source = readSource("src/features/admin/dashboard/api/admin-stats-api.ts")
  const mutant = swapFirst(
    source,
    "/api/v1/admin/stats/users",
    "/api/v1/admin/stats/content",
  )

  assert.throws(() => assertStatsApiBindings(mutant))
})

test("admin stats hook owns three parallel keys and one aggregate retry", () => {
  const source = readSource("src/features/admin/dashboard/hooks/use-admin-stats.ts")
  const keysSource = readSource(
    "src/features/admin/dashboard/lib/admin-stats-keys.ts",
  )

  assert.equal((source.match(/useQuery\s*\(\s*\{/g) ?? []).length, 3)
  assertAdminStatsKeyBindings(keysSource, source)
  for (const queryFn of [
    "getAdminUserStats",
    "getAdminContentStats",
    "getAdminReportStats",
  ]) {
    assert.match(source, new RegExp(`queryFn:\\s*${queryFn}`))
  }
  assert.match(
    compactSource(source),
    /isPending = userQuery\.isPending \|\| contentQuery\.isPending \|\| reportsQuery\.isPending/,
  )
  assert.match(
    compactSource(source),
    /isError = userQuery\.isError \|\| contentQuery\.isError \|\| reportsQuery\.isError/,
  )
  assert.match(
    compactSource(source),
    /isFetching = userQuery\.isFetching \|\| contentQuery\.isFetching \|\| reportsQuery\.isFetching/,
  )
  assert.match(
    compactSource(source),
    /hasData = userQuery\.data !== undefined && contentQuery\.data !== undefined && reportsQuery\.data !== undefined/,
  )
  assert.match(source, /\bisFetching,/)
  assert.match(source, /\bhasData,/)
  assert.match(source, /Promise\.all\s*\(\s*\[/)
  for (const queryName of ["userQuery", "contentQuery", "reportsQuery"]) {
    assert.match(source, new RegExp(`${queryName}\\.refetch\\(\\)`))
  }
  assert.doesNotMatch(source, /\b(?:from|to)\s*:/)
})

test("admin dashboard renders every KPI and the default backend range", () => {
  const source = readSource(
    "src/features/admin/dashboard/components/admin-dashboard-page.tsx",
  )

  assertDashboardMetricBindings(source)
  assert.match(source, /messages\.admin\.dashboard\.range\(user\.from, user\.to\)/)
  assert.match(
    compactSource(source),
    /new Intl\.NumberFormat\(locale, \{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,? \}\)\.format\(value\)/,
  )
  assert.doesNotMatch(source, /value\s*\*\s*100|`\$\{[^}]+\}%`/)
})

test("admin dashboard metric contract rejects a swapped-field mutant", () => {
  const source = readSource(
    "src/features/admin/dashboard/components/admin-dashboard-page.tsx",
  )
  const mutant = swapFirst(
    source,
    "countFormatter.format(user.signupCount)",
    "countFormatter.format(user.activeUserCount)",
  )

  assert.throws(() => assertDashboardMetricBindings(mutant))
})

test("Intl percent formatting owns locale-specific percent sign spacing", () => {
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  assert.match(formatter.format(0.456), /^45,6\s%$/u)
})

test("admin dashboard keeps cached cards with one adjacent retry state on refetch errors", () => {
  const componentSource = readSource(
    "src/features/admin/dashboard/components/admin-dashboard-page.tsx",
  )
  const asyncStateSource = readSource(
    "src/features/admin/shared/components/admin-async-state.tsx",
  )
  const pageSource = readSource("src/app/admin/(protected)/page.tsx")
  const allDashboardSource = [
    readSource("src/features/admin/dashboard/api/admin-stats-api.ts"),
    readSource("src/features/admin/dashboard/hooks/use-admin-stats.ts"),
    componentSource,
    pageSource,
  ].join("\n")

  assert.doesNotMatch(componentSource, /if\s*\(\s*isError\s*\)/)
  assert.match(
    compactSource(componentSource),
    /if \( !hasData \|\| user === undefined \|\| content === undefined \|\| reports === undefined \) \{/,
  )
  assert.match(componentSource, /if \(isPending && !isError\)/)
  assert.match(componentSource, /<AdminAsyncState kind="loading" \/>/)
  const dataPresentSource = componentSource.slice(
    componentSource.indexOf("const countFormatter"),
  )
  const cachedErrorStart = dataPresentSource.indexOf("{isError &&")
  const cardsStart = dataPresentSource.indexOf("<dl")

  assert.notEqual(cachedErrorStart, -1, "cached-data render must consume isError")
  assert.ok(cardsStart > cachedErrorStart, "retry state must render adjacent before KPI cards")
  assert.equal((componentSource.match(/kind="error"/g) ?? []).length, 2)
  assert.equal((dataPresentSource.match(/kind="error"/g) ?? []).length, 1)

  const cachedErrorSource = dataPresentSource.slice(cachedErrorStart, cardsStart)

  assert.equal((cachedErrorSource.match(/<AdminAsyncState/g) ?? []).length, 1)
  assert.match(cachedErrorSource, /kind="error"/)
  assert.match(cachedErrorSource, /onRetry=\{\(\) => void refetch\(\)\}/)
  assert.match(cachedErrorSource, /retryDisabled=\{isFetching\}/)
  assert.match(cachedErrorSource, /isRetrying=\{isFetching\}/)
  assert.match(componentSource, /retryDisabled=\{isFetching\}/)
  assert.match(componentSource, /isRetrying=\{isFetching\}/)
  assert.match(componentSource, /aria-busy=\{isFetching \|\| undefined\}/)
  assert.match(asyncStateSource, /retryDisabled\?: boolean/)
  assert.match(asyncStateSource, /isRetrying\?: boolean/)
  assert.match(
    compactSource(asyncStateSource),
    /disabled=\{props\.retryDisabled \|\| props\.isRetrying\}/,
  )
  assert.match(
    compactSource(asyncStateSource),
    /aria-busy=\{props\.isRetrying \|\| undefined\}/,
  )
  assert.match(pageSource, /<AdminDashboardPage \/>/)
  assert.doesNotMatch(
    allDashboardSource,
    /(?:from\s+["'][^"']*(?:chart|recharts)|import\s+["'][^"']*(?:chart|recharts))/i,
  )
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

test("sanction success invalidates exact user and report KPI caches only", () => {
  const source = readSource("src/features/admin/users/hooks/use-admin-users.ts")

  assertAdminSanctionStatsInvalidation(source)

  const wrongKeyMutant = source.replace(
    "adminStatsKeys.reports",
    "adminStatsKeys.content",
  )
  const broadKeyMutant = source.replace(
    "queryKey: adminStatsKeys.users,\n      exact: true,",
    "queryKey: adminStatsKeys.users,",
  )
  const staleStatsMutant = source.replace(
    "onSuccess: () => invalidateAdminSanctionQueries(queryClient, userId)",
    "onSuccess: () => invalidateAdminUserQueries(queryClient, userId)",
  )

  for (const mutant of [wrongKeyMutant, broadKeyMutant, staleStatsMutant]) {
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
    "adminStatsKeys.reports",
    "adminStatsKeys.users",
  )
  const successOnlyMutant = source.replace(
    "onSettled: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
    "onSuccess: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
  )
  const staleUserMutant = source.replace(
    "onSettled: () => invalidateAdminReportDismissalQueries(queryClient, reportId, reportedUserId)",
    "onSettled: () => invalidateAdminReportDecisionQueries(queryClient, reportId)",
  )

  for (const mutant of [wrongStatsMutant, successOnlyMutant, staleUserMutant]) {
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
  const pendingRecoveryMutant = source.replace(
    'getAdminInquiries({ status: "answered", cursor, size: 20 })',
    'getAdminInquiries({ status: "pending", cursor, size: 20 })',
  )
  const firstPageOnlyMutant = source.replace(
    "cursor = page.nextCursor",
    "cursor = null",
  )

  for (const mutant of [
    nonNullableEmailMutant,
    droppedCursorMutant,
    droppedBodyMutant,
    wrongMethodMutant,
    pendingRecoveryMutant,
    firstPageOnlyMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryApiContracts(mutant))
  }
})

test("admin inquiry hooks keep cursor keys stale-only and invalidate every settled answer", () => {
  const source = readSource(
    "src/features/admin/inquiries/hooks/use-admin-inquiries.ts",
  )

  assertAdminInquiryHooks(source)

  const successOnlyMutant = source.replace("onSettled:", "onSuccess:")
  const automaticRefetchMutant = source.replace('refetchType: "none",', "")
  const wrongPrefixMutant = source.replace(
    "queryKey: adminInquiryKeys.all",
    "queryKey: adminInquiryKeys.lists()",
  )
  const droppedStatusKeyMutant = source.replace("{ status, size },", "{ size },")

  for (const mutant of [
    successOnlyMutant,
    automaticRefetchMutant,
    wrongPrefixMutant,
    droppedStatusKeyMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryHooks(mutant))
  }
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
  const missingUnlockMutant = source.replace(
    'return state.reason === "uncertain"\n      ? initialAdminInquiryAnswerConvergenceState\n      : { kind: "retry", reason: state.reason }',
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

  for (const mutant of [
    failedUnlockMutant,
    missingUnlockMutant,
    uncertainRetryMutant,
    pendingUnlockMutant,
  ]) {
    assert.notEqual(mutant, source)
    assert.throws(() => assertAdminInquiryAnswerConvergenceState(mutant))
  }
})

test("admin inquiries preserve isolated row state and recover filtered canonical answers", () => {
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
  const unguardedMutant = source.replace(
    'if (answerLatch.current !== "idle") return',
    "if (false) return",
  )
  const duplicateMutationMutant = source.replace(
    "answerMutation.mutate({ answer }, {",
    "answerMutation.mutate({ answer })\n    answerMutation.mutate({ answer }, {",
  )
  const duplicateRefetchMutant = source.replace(
    "await inquiriesQuery.refetch({ cancelRefetch: true })",
    "await inquiriesQuery.refetch({ cancelRefetch: true })\n      await inquiriesQuery.refetch({ cancelRefetch: true })",
  )
  const staleRefetchMutant = source.replace(
    "await inquiriesQuery.refetch({ cancelRefetch: true })",
    "await inquiriesQuery.refetch({ cancelRefetch: false })",
  )
  const uncertainUnlockMutant = source.replace(
    '            : "uncertain"\n        beginAnswerConvergence(reason, inquiry)',
    '            : "uncertain"\n        if (reason === "uncertain") {\n          releaseAnswerLock()\n          return\n        }\n        beginAnswerConvergence(reason, inquiry)',
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
  const droppedAnsweredRecoveryMutant = source.replace(
    "await findAnsweredAdminInquiry(targetInquiry.inquiryId)",
    "null",
  )
  const droppedResolvedSnapshotMutant = source.replace(
    "resolvedAnswer !== null &&",
    "false &&",
  )
  const droppedDetachedRetryMutant = source.replace(
    "answerTarget !== null && !answerTargetIsVisible &&",
    "false &&",
  )

  for (const mutant of [
    missingExpandedMutant,
    missingControlsMutant,
    rowClickMutant,
    sharedDraftMutant,
    missingFallbackMutant,
    answeredFormMutant,
    unguardedMutant,
    duplicateMutationMutant,
    duplicateRefetchMutant,
    staleRefetchMutant,
    uncertainUnlockMutant,
    duplicateRetryMutant,
    staleSelectionMutant,
    swappedSubjectMutant,
    droppedAnsweredRecoveryMutant,
    droppedResolvedSnapshotMutant,
    droppedDetachedRetryMutant,
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
    "inquiriesQuery.isError &&\n              !inquiriesQuery.isFetchNextPageError &&\n              answerBusyInquiryId === null",
    "inquiriesQuery.isError",
  )
  const emptyDuplicateErrorMutant = source.replace(
    "inquiriesQuery.isError &&\n          inquiries.length === 0 &&\n          answerBusyInquiryId === null",
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
