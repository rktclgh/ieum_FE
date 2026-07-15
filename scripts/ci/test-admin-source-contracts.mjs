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
