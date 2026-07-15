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

test("admin stats API calls exactly the three default-range GET endpoints", () => {
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
  for (const functionName of [
    "getAdminUserStats",
    "getAdminContentStats",
    "getAdminReportStats",
  ]) {
    assert.match(source, new RegExp(`async function ${functionName}\\(\\)`))
  }
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
  const metricPairs = [
    ["signup", "user.signupCount"],
    ["activeUsers", "user.activeUserCount"],
    ["suspendedUsers", "user.suspendedUserCount"],
    ["pins", "content.pinCount"],
    ["questions", "content.questionCount"],
    ["meetings", "content.meetingCount"],
    ["answers", "content.answerCount"],
    ["acceptedRate", "content.acceptedRate"],
    ["messages", "content.messageCount"],
    ["reports", "reports.reportCount"],
    ["aiReviewed", "reports.aiReviewedCount"],
    ["confirmed", "reports.confirmedCount"],
    ["dismissed", "reports.dismissedCount"],
    ["sanctions", "reports.sanctionCount"],
  ]

  assert.equal((source.match(/\{\s*label:/g) ?? []).length, 14)
  for (const [messageKey, field] of metricPairs) {
    assert.match(source, new RegExp(`messages\\.admin\\.dashboard\\.${messageKey}`))
    assert.match(source, new RegExp(field.replace(".", "\\.")))
  }
  assert.match(source, /messages\.admin\.dashboard\.range\(user\.from, user\.to\)/)
  assert.match(source, /new Intl\.NumberFormat/)
  assert.match(source, /minimumFractionDigits:\s*1/)
  assert.match(source, /maximumFractionDigits:\s*1/)
  assert.match(source, /\.format\(value \* 100\)/)
  assert.match(source, /`\$\{[^}]+\}%`/)
})

test("admin dashboard aggregates pending and error states without chart imports", () => {
  const componentSource = readSource(
    "src/features/admin/dashboard/components/admin-dashboard-page.tsx",
  )
  const pageSource = readSource("src/app/admin/(protected)/page.tsx")
  const allDashboardSource = [
    readSource("src/features/admin/dashboard/api/admin-stats-api.ts"),
    readSource("src/features/admin/dashboard/hooks/use-admin-stats.ts"),
    componentSource,
    pageSource,
  ].join("\n")

  assert.match(componentSource, /if \(isError/)
  assert.match(componentSource, /kind="error" onRetry=\{\(\) => void refetch\(\)\}/)
  assert.match(componentSource, /if \(isPending\)/)
  assert.match(componentSource, /<AdminAsyncState kind="loading" \/>/)
  assert.match(pageSource, /<AdminDashboardPage \/>/)
  assert.doesNotMatch(
    allDashboardSource,
    /(?:from\s+["'][^"']*(?:chart|recharts)|import\s+["'][^"']*(?:chart|recharts))/i,
  )
})
