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
  const start = source.indexOf(`async function ${functionName}()`)
  const nextFunction = source.indexOf("\nasync function ", start + 1)
  const nextExport = source.indexOf("\nexport ", start + 1)
  const end = nextFunction === -1 ? nextExport : nextFunction

  assert.notEqual(start, -1, `${functionName} must exist`)
  assert.ok(end > start, `${functionName} must have a bounded source block`)

  return source.slice(start, end)
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

  assert.equal((source.match(/useQuery\s*\(\s*\{/g) ?? []).length, 3)
  for (const [suffix, queryFn] of [
    ["users", "getAdminUserStats"],
    ["content", "getAdminContentStats"],
    ["reports", "getAdminReportStats"],
  ]) {
    assert.match(
      source,
      new RegExp(`queryKey:\\s*\\["admin",\\s*"stats",\\s*"${suffix}"\\]`),
    )
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

test("admin dashboard keeps cached cards during refetch errors and disables active retry", () => {
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
