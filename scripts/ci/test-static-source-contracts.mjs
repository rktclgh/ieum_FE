import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import ts from "typescript"

import { discoverStaticAppRoutes } from "./static-export-routes.mjs"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const fixedStaticRoutes = [
  "",
  "admin",
  "admin/inquiries",
  "admin/knowledge",
  "admin/login",
  "admin/reports",
  "admin/reports/detail",
  "admin/users",
  "admin/users/detail",
  "chats",
  "chats/notices",
  "chats/report",
  "chats/room",
  "chats/schedule",
  "friends",
  "join",
  "join/social",
  "login",
  "meetups/detail",
  "my",
  "my/edit",
  "my/inquiry",
  "my/notifications",
  "my/permissions",
  "notifications",
  "oauth/kakao/callback",
  "questions",
  "questions/detail",
]

const fixedAdminRoutes = [
  "admin",
  "admin/inquiries",
  "admin/knowledge",
  "admin/login",
  "admin/reports",
  "admin/reports/detail",
  "admin/users",
  "admin/users/detail",
]

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(entryPath)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : []
  })
}

function parse(relativePath) {
  return ts.createSourceFile(
    relativePath,
    read(relativePath),
    ts.ScriptTarget.ES2022,
    true,
    relativePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

function visit(node, predicate) {
  const matches = []
  const walk = (current) => {
    if (predicate(current)) matches.push(current)
    ts.forEachChild(current, walk)
  }
  walk(node)
  return matches
}

function findFunction(sourceFile, name) {
  return visit(
    sourceFile,
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  )[0]
}

function unwrapParentheses(expression) {
  return ts.isParenthesizedExpression(expression)
    ? unwrapParentheses(expression.expression)
    : expression
}

function flattenOr(expression) {
  const unwrapped = unwrapParentheses(expression)
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.BarBarToken
  ) {
    return [...flattenOr(unwrapped.left), ...flattenOr(unwrapped.right)]
  }
  return [unwrapped]
}

function nullCheckedIdentifier(expression) {
  const unwrapped = unwrapParentheses(expression)
  if (
    !ts.isBinaryExpression(unwrapped) ||
    unwrapped.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
  ) {
    return null
  }

  if (ts.isIdentifier(unwrapped.left) && unwrapped.right.kind === ts.SyntaxKind.NullKeyword) {
    return unwrapped.left.text
  }
  if (unwrapped.left.kind === ts.SyntaxKind.NullKeyword && ts.isIdentifier(unwrapped.right)) {
    return unwrapped.right.text
  }
  return null
}

function compact(text) {
  return text.replace(/\s+/g, "")
}

function directoryPaths(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []

    const entryPath = path.join(directory, entry.name)
    return [entryPath, ...directoryPaths(entryPath)]
  })
}

function markdownSection(source, startHeading, endHeading) {
  const start = source.indexOf(startHeading)
  const end = source.indexOf(endHeading, start + startHeading.length)
  assert.ok(start >= 0, `missing markdown section: ${startHeading}`)
  assert.ok(end > start, `missing markdown section boundary: ${endHeading}`)
  return source.slice(start, end)
}

function normalizeDocumentedRoute(url) {
  const pathname = url.split("?", 1)[0]
  return pathname === "/" ? "" : pathname.replace(/^\/+|\/+$/g, "")
}

function documentedRoutes(section) {
  return [
    ...new Set(
      [...section.matchAll(/^\|\s*`(\/[^`]*)`\s*\|/gm)].map((match) =>
        normalizeDocumentedRoute(match[1]),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"))
}

test("app tree exposes exactly the root and 27 fixed static routes", async () => {
  const routes = await discoverStaticAppRoutes(path.join(repoRoot, "src/app"))

  assert.deepEqual(routes, fixedStaticRoutes)
  assert.deepEqual(
    routes.filter((route) => route === "admin" || route.startsWith("admin/")),
    fixedAdminRoutes,
  )
})

test("admin pages use fixed paths and stay inside the desktop boundary", async () => {
  const adminRoot = path.join(repoRoot, "src/app/admin")
  const dynamicDirectories = directoryPaths(adminRoot)
    .filter((directory) => /^\[.*\]$/.test(path.basename(directory)))
    .map((directory) => path.relative(repoRoot, directory))

  assert.deepEqual(dynamicDirectories, [], "admin routes must not use runtime ID directories")
  assert.deepEqual(
    await discoverStaticAppRoutes(path.join(adminRoot, "(protected)")),
    ["", "inquiries", "knowledge", "reports", "reports/detail", "users", "users/detail"],
  )

  const boundaryFile = parse(
    "src/features/admin/shared/components/admin-desktop-boundary.tsx",
  )
  const boundary = findFunction(boundaryFile, "AdminDesktopBoundary")
  assert.ok(boundary?.body, "AdminDesktopBoundary implementation is missing")

  const boundaryReturns = visit(boundary.body, ts.isReturnStatement)
  assert.equal(boundaryReturns.length, 2)
  assert.match(
    boundaryReturns[0].expression?.getText(boundaryFile) ?? "",
    /messages\.admin\.auth\.desktopOnly/,
  )
  assert.ok(
    boundaryReturns[0].end < boundaryReturns[1].pos,
    "the unsupported viewport branch must return before children",
  )
  assert.ok(
    boundaryReturns[1].expression &&
      ts.isIdentifier(boundaryReturns[1].expression) &&
      boundaryReturns[1].expression.text === "children",
    "AdminDesktopBoundary must have one final children return",
  )

  const protectedLayoutFile = parse("src/app/admin/(protected)/layout.tsx")
  const protectedLayout = findFunction(protectedLayoutFile, "ProtectedAdminLayout")
  assert.ok(protectedLayout?.body, "ProtectedAdminLayout implementation is missing")
  assert.match(
    compact(protectedLayout.getText(protectedLayoutFile)),
    /<AdminGatepolicy="protected"><AdminDesktopBoundary><AdminShell>\{children\}<\/AdminShell><\/AdminDesktopBoundary><\/AdminGate>/,
  )

  assert.match(
    compact(read("src/app/admin/login/page.tsx")),
    /<AdminGatepolicy="login"><AdminDesktopBoundary><AdminLoginPage\/><\/AdminDesktopBoundary><\/AdminGate>/,
  )
})

test("route documents publish the same complete static inventory", () => {
  const routesDocument = read("docs/ROUTES.md")
  const handoffDocument = read("docs/be-map-handoff.md")
  const routesSection = markdownSection(
    routesDocument,
    "## 구현된 라우트",
    "## 런타임 ID URL 전환표",
  )
  const handoffSection = markdownSection(
    handoffDocument,
    "### Spring forward/controller/JAR smoke canonical 목록",
    "### Security와 요청 분기",
  )

  assert.deepEqual(documentedRoutes(routesSection), fixedStaticRoutes)
  assert.deepEqual(documentedRoutes(handoffSection), fixedStaticRoutes)
  assert.doesNotMatch(routesDocument, /\/my\/settings\//)
  assert.doesNotMatch(handoffDocument, /\/my\/settings\//)

  for (const route of fixedStaticRoutes) {
    const canonicalUrl = route === "" ? "/" : `/${route}/`
    const staticTarget = route === "" ? "/index.html" : `/${route}/index.html`
    assert.ok(
      handoffSection.includes(`| \`${canonicalUrl}\` | \`${staticTarget}\` |`),
      `backend handoff must map ${canonicalUrl} to ${staticTarget}`,
    )
  }

  for (const apiGroup of [
    "/api/v1/admin/stats",
    "/api/v1/admin/users",
    "/api/v1/admin/reports",
    "/api/v1/admin/inquiries",
  ]) {
    assert.ok(routesDocument.includes(apiGroup), `missing admin API group: ${apiGroup}`)
  }
  assert.match(routesDocument, /1024px/)
  assert.match(routesDocument, /positive safe integer/)
  assert.match(routesDocument, /StaticPageController/)
})

test("frontend update dispatch pins one validated commit SHA", () => {
  const workflow = read(".github/workflows/notify-app-main.yml")

  assert.ok(workflow.includes('frontend_sha="$GITHUB_SHA"'))
  assert.ok(workflow.includes('[[ ! "$frontend_sha" =~ ^[0-9a-f]{40}$ ]]'))
  assert.ok(
    workflow.includes(
      "printf -v payload '{\"event_type\":\"frontend-updated\",\"client_payload\":{\"frontend_sha\":\"%s\"}}' \"$frontend_sha\"",
    ),
  )
  assert.ok(workflow.includes('--data "$payload"'))
  assert.doesNotMatch(workflow, /--data '\{"event_type": "frontend-updated"\}'/)
})

test("fixed query pages validate IDs before mounting data content", () => {
  const pages = [
    {
      path: "src/app/chats/room/page.tsx",
      params: [{ query: "chatId", variable: "roomId" }],
      content: "<ChatRoomPageContent",
    },
    {
      path: "src/app/chats/notices/page.tsx",
      params: [{ query: "chatId", variable: "roomId" }],
      content: "<NoticePageContent",
    },
    {
      path: "src/app/chats/schedule/page.tsx",
      params: [{ query: "chatId", variable: "roomId" }],
      content: "<SchedulePageContent",
    },
    {
      path: "src/app/meetups/detail/page.tsx",
      params: [{ query: "meetingId", variable: "meetingId" }],
      content: "<MeetupDetailContainer",
    },
    {
      path: "src/app/questions/detail/page.tsx",
      params: [{ query: "questionId", variable: "questionId" }],
      content: "<AnswerViewScreen",
    },
  ]

  for (const page of pages) {
    const source = read(page.path)
    const sourceFile = parse(page.path)
    assert.match(source, /<React\.Suspense\b/, `${page.path} must own a Suspense boundary`)
    for (const parameter of page.params) {
      assert.ok(
        compact(source).includes(
          `const${parameter.variable}=parsePositiveInteger(searchParams.get("${parameter.query}"))`,
        ),
        `${page.path} must validate ${parameter.query} into ${parameter.variable}`,
      )
    }

    const invalidGuard = visit(sourceFile, (node) => ts.isIfStatement(node)).find((statement) =>
      statement.thenStatement.getText(sourceFile).includes('kind="invalid-link"'),
    )
    assert.ok(invalidGuard, `${page.path} must render the invalid-link state from an ID guard`)

    const guardStatements = ts.isBlock(invalidGuard.thenStatement)
      ? invalidGuard.thenStatement.statements
      : [invalidGuard.thenStatement]
    assert.equal(
      guardStatements.length,
      1,
      `${page.path} invalid guard must have exactly one blocking return`,
    )
    assert.ok(
      ts.isReturnStatement(guardStatements[0]) &&
        guardStatements[0].expression?.getText(sourceFile).includes('kind="invalid-link"'),
      `${page.path} invalid guard must return before data content can mount`,
    )

    const guardedVariables = flattenOr(invalidGuard.expression)
      .map(nullCheckedIdentifier)
      .filter(Boolean)
      .sort()
    assert.deepEqual(
      guardedVariables,
      page.params.map(({ variable }) => variable).sort(),
      `${page.path} must reject every parsed ID with OR semantics`,
    )

    const contentMount = source.indexOf(page.content)
    assert.ok(
      contentMount > invalidGuard.end,
      `${page.path} must guard before mounting content`,
    )
  }
})

test("report page validates its parsed target before mounting data content", () => {
  const pagePath = "src/app/chats/report/page.tsx"
  const source = read(pagePath)
  const sourceFile = parse(pagePath)

  assert.match(source, /<React\.Suspense\b/, `${pagePath} must own a Suspense boundary`)
  assert.ok(
    compact(source).includes("consttarget=parseReportTarget(searchParams)"),
    `${pagePath} must parse its target from the search parameters`,
  )

  const invalidGuard = visit(sourceFile, (node) =>
    ts.isIfStatement(node) &&
    compact(node.expression.getText(sourceFile)) === "target===null",
  )[0]
  assert.ok(invalidGuard, `${pagePath} must render the invalid-link state for a null target`)

  const guardStatements = ts.isBlock(invalidGuard.thenStatement)
    ? invalidGuard.thenStatement.statements
    : [invalidGuard.thenStatement]
  assert.equal(
    guardStatements.length,
    1,
    `${pagePath} invalid guard must have exactly one blocking return`,
  )
  const invalidReturn = guardStatements[0]
  assert.ok(
    ts.isReturnStatement(invalidReturn),
    `${pagePath} invalid guard must return before data content can mount`,
  )
  assert.ok(
    ts.isJsxSelfClosingElement(invalidReturn.expression) &&
      invalidReturn.expression.tagName.getText(sourceFile) === "RoutePageState" &&
      invalidReturn.expression.attributes.properties.some(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.text === "kind" &&
          ts.isStringLiteral(attribute.initializer) &&
          attribute.initializer.text === "invalid-link",
      ),
    `${pagePath} invalid guard must return <RoutePageState kind="invalid-link" />`,
  )

  assert.ok(
    source.indexOf("<ReportPageContent") > invalidGuard.end,
    `${pagePath} must guard before mounting content`,
  )
})

test("source contains no legacy runtime-ID navigation templates", () => {
  const legacyNavigation =
    /(?:router\.(?:push|replace)\(|href=\{)\s*`\/(?:chats|meetups|questions)\/\$\{/

  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const source = fs.readFileSync(file, "utf8")
    assert.doesNotMatch(source, legacyNavigation, path.relative(repoRoot, file))
  }
})

test("fixed query route literals stay centralized in the route builders", () => {
  const fixedRoutes =
    /^\/(?:admin\/(?:users|reports)\/detail|chats\/(?:room|notices|report|schedule)|meetups\/detail|questions\/detail)\//

  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const relativePath = path.relative(repoRoot, file)
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(relativePath)) continue
    const sourceFile = ts.createSourceFile(
      relativePath,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.ES2022,
      true,
      relativePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const literals = visit(sourceFile, (node) =>
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      node.kind === ts.SyntaxKind.TemplateHead,
    )

    for (const literal of literals) {
      if (!fixedRoutes.test(literal.text)) continue
      assert.equal(
        relativePath,
        "src/lib/navigation/routes.ts",
        `${relativePath} must use a fixed-query route builder instead of ${literal.text}`,
      )
    }
  }
})

test("auth gates, session reset subscription, and login invalidation stay wired", () => {
  assert.match(read("src/app/my/layout.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/login/page.tsx"), /<AuthGate policy="guest-only">/)
  assert.equal(fs.existsSync(path.join(repoRoot, "src/app/join/layout.tsx")), true)
  assert.match(read("src/app/join/layout.tsx"), /<AuthGate policy="guest-only">/)
  assert.doesNotMatch(read("src/app/join/page.tsx"), /\bAuthGate\b/)
  assert.doesNotMatch(read("src/app/join/social/page.tsx"), /\bAuthGate\b/)

  // 회원 전용: 조회 API도 로그인 필수(BE /api/** authenticated)이므로 회원 라우트는 모두 protected.
  assert.match(read("src/app/page.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/questions/layout.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/meetups/layout.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/friends/layout.tsx"), /<AuthGate policy="protected">/)
  assert.match(read("src/app/chats/layout.tsx"), /<AuthGate policy="protected">/)

  const authGateFile = parse("src/features/session/components/auth-gate.tsx")
  const authGate = findFunction(authGateFile, "AuthGate")
  assert.ok(authGate?.body, "AuthGate implementation is missing")
  const authGateText = compact(authGate.getText(authGateFile))
  assert.ok(
    authGateText.includes(
      'constshouldRedirectToLogin=policy==="protected"&&state.kind==="guest"',
    ),
    "protected guests must be classified for login redirect",
  )
  assert.ok(
    authGateText.includes(
      'constshouldRedirectHome=policy==="guest-only"&&state.kind==="authenticated"',
    ),
    "authenticated guests-only visitors must be classified for home redirect",
  )
  assert.ok(
    authGateText.includes("if(shouldRedirectToLogin){router.replace(routes.login())}"),
    "protected guests must be redirected to the fixed login route",
  )
  assert.ok(
    authGateText.includes("elseif(shouldRedirectHome){router.replace(routes.home())}"),
    "authenticated guests-only visitors must be redirected home",
  )

  const gateBranches = authGate.body.statements.filter(ts.isIfStatement)
  const backendDownBranch = gateBranches.find(
    (statement) => compact(statement.expression.getText(authGateFile)) === 'state.kind==="backend-down"',
  )
  assert.match(
    backendDownBranch?.thenStatement.getText(authGateFile) ?? "",
    /<SessionUnavailable\s+onRetry=/,
    "backend failures must keep the route mounted with retry UI",
  )
  const blockingBranch = gateBranches.find((statement) =>
    statement.thenStatement.getText(authGateFile).includes("<SessionLoading"),
  )
  assert.match(
    blockingBranch?.thenStatement.getText(authGateFile) ?? "",
    /<SessionLoading\s+refreshing=\{state\.kind === "refreshing"\}\s*\/>/,
    "loading and redirect transitions must not expose gated children",
  )
  assert.deepEqual(
    blockingBranch
      ? flattenOr(blockingBranch.expression)
          .map((expression) => compact(expression.getText(authGateFile)))
          .sort()
      : [],
    [
      'state.kind==="loading"',
      'state.kind==="refreshing"',
      "shouldRedirectHome",
      "shouldRedirectToLogin",
    ].sort(),
    "loading, refreshing, and both redirect transitions must block children with OR semantics",
  )
  const finalStatement = authGate.body.statements.at(-1)
  assert.ok(
    finalStatement &&
      ts.isReturnStatement(finalStatement) &&
      finalStatement.expression &&
      ts.isIdentifier(finalStatement.expression) &&
      finalStatement.expression.text === "children",
    "AuthGate must render children only after all blocking branches",
  )

  const provider = read("src/lib/query/query-provider.tsx")
  assert.match(provider, /subscribeSessionExpired\(\(\) => \{/)
  assert.match(provider, /resetSessionCache\(queryClient\)/)

  const invalidation = /invalidateQueries\(\{\s*queryKey: ME_QUERY_KEY, exact: true\s*\}\)/g
  assert.equal(read("src/features/login/hooks/use-login-mutations.ts").match(invalidation)?.length, 1)
  assert.equal(
    read("src/features/social-login/hooks/use-social-mutations.ts").match(invalidation)?.length,
    2,
  )
})

test("obsolete static deploy plan stays removed", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "docs/static-deploy-plan.md")), false)
})

test("profile and settings mutations install the session-generation callbacks", () => {
  const relativePath = "src/features/my/hooks/use-my-mutations.ts"
  const sourceFile = parse(relativePath)

  for (const functionName of ["useUpdateMe", "useUpdateSettings"]) {
    const hook = findFunction(sourceFile, functionName)
    assert.ok(hook?.body, `${functionName} is missing`)

    const mutationCall = visit(
      hook,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "useMutation",
    )[0]
    assert.ok(mutationCall, `${functionName} must create a mutation`)

    const options = mutationCall.arguments[0]
    assert.ok(
      options && ts.isObjectLiteralExpression(options),
      `${functionName} must define mutation options inline`,
    )
    const sessionCallbacks = options.properties.find(
      (property) =>
        ts.isSpreadAssignment(property) &&
        ts.isCallExpression(property.expression) &&
        ts.isIdentifier(property.expression.expression) &&
        property.expression.expression.text === "createSessionMutationCallbacks",
    )
    assert.ok(
      sessionCallbacks && ts.isSpreadAssignment(sessionCallbacks),
      `${functionName} must spread the shared session callbacks into useMutation`,
    )
    assert.equal(
      options.properties.at(-1),
      sessionCallbacks,
      `${functionName} must not override onMutate or onSuccess after the session guard`,
    )

    const callbackCall = sessionCallbacks.expression
    assert.equal(
      callbackCall.arguments[0]?.getText(sourceFile),
      "queryClient",
      `${functionName} must bind callbacks to its active QueryClient`,
    )
    const successCallback = callbackCall.arguments[1]
    assert.ok(
      successCallback &&
        (ts.isArrowFunction(successCallback) || ts.isFunctionExpression(successCallback)),
      `${functionName} must provide the current-session success update`,
    )
    const callbackText = compact(successCallback.getText(sourceFile))
    assert.ok(
      callbackText.includes("queryClient.setQueryData<UserMeResponse>(ME_QUERY_KEY"),
      `${functionName} must update only the shared me cache after the generation check`,
    )
  }
})

test("question delete rollback and invalidation stay session-generation guarded", () => {
  const source = compact(read("src/features/question/hooks/use-question-mutations.ts"))

  assert.ok(source.includes("constsessionGeneration=getSessionGeneration(queryClient)"))
  assert.ok(source.includes("return{previous,sessionGeneration}"))
  assert.equal(
    source.match(
      /if\(!isSessionGenerationCurrent\(queryClient,context\?\.sessionGeneration\)\)return/g,
    )?.length,
    2,
  )
})

test("public data hooks opt into the public session query scope", () => {
  const expectedPublicMetaCounts = new Map([
    ["src/features/question/hooks/use-question-queries.ts", 2],
    ["src/features/meetup/hooks/use-meetup-queries.ts", 2],
    ["src/features/map/hooks/use-place-search.ts", 1],
    ["src/features/map/hooks/use-pin-list.ts", 1],
    ["src/features/map/hooks/use-geocode.ts", 1],
    ["src/features/map/hooks/use-map-pins.ts", 1],
    ["src/features/map/hooks/use-reverse-geocode.ts", 1],
  ])

  for (const [relativePath, expectedCount] of expectedPublicMetaCounts) {
    const source = read(relativePath)
    assert.match(source, /import \{ PUBLIC_QUERY_META \}/, relativePath)
    assert.equal(source.match(/meta: PUBLIC_QUERY_META/g)?.length, expectedCount, relativePath)
  }
})

test("meetup date picker lets the Drawer portal own content remounting", () => {
  const relativePath = "src/features/meetup/components/meetup-date-picker.tsx"
  const sourceFile = parse(relativePath)
  const picker = findFunction(sourceFile, "MeetupDatePicker")
  assert.ok(picker?.body, "MeetupDatePicker implementation is missing")

  const content = visit(
    picker,
    (node) =>
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(sourceFile) === "MeetupDatePickerContent",
  )[0]
  assert.ok(
    content && ts.isJsxSelfClosingElement(content),
    "MeetupDatePickerContent mount is missing",
  )

  const keyAttribute = content.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "key",
  )
  assert.equal(
    Boolean(keyAttribute),
    false,
    "DrawerPortal unmounts after its exit transition; content must not remount early from a key change",
  )
})

test("REST, map, and WebSocket consumers keep the same-origin transport contract", () => {
  assert.match(read("src/lib/api/client.ts"), /baseURL: DEV_BACKEND_ORIGIN/)

  const socket = read("src/features/chat/lib/chat-socket.ts")
  assert.match(socket, /DEV_BACKEND_ORIGIN \?\? window\.location\.origin/)
  assert.match(socket, /toWebSocketUrl\(origin\)/)

  for (const apiFile of [
    "src/features/map/api/place-search-api.ts",
    "src/features/map/api/reverse-geocode-api.ts",
    "src/features/map/api/geocode-api.ts",
  ]) {
    const source = read(apiFile)
    assert.match(source, /import \{ apiClient \} from "@\/lib\/api\/client"/)
    assert.doesNotMatch(source, /\bfetch\(/)

    const sourceFile = parse(apiFile)
    const calls = visit(sourceFile, ts.isCallExpression)
    const apiClientCalls = calls.filter(
      (call) =>
        ts.isPropertyAccessExpression(call.expression) &&
        ts.isIdentifier(call.expression.expression) &&
        call.expression.expression.text === "apiClient" &&
        ["get", "post", "put", "patch", "delete"].includes(call.expression.name.text),
    )
    assert.ok(apiClientCalls.length > 0, `${apiFile} must execute requests through apiClient`)
    assert.equal(
      calls.some((call) => ts.isIdentifier(call.expression) && call.expression.text === "fetch"),
      false,
      `${apiFile} must not bypass the shared transport with fetch`,
    )
  }
})

test("Web Push async work is fenced to the originating session", () => {
  const hook = compact(
    read("src/features/notification/hooks/use-web-push-subscription.ts"),
  )
  const api = compact(read("src/features/notification/api/web-push-api.ts"))

  assert.ok(hook.includes("useQueryClient()"))
  assert.ok(hook.includes("getSessionGeneration(queryClient)"))
  assert.ok(hook.includes("getSessionAbortSignal(queryClient)"))
  assert.ok(hook.includes("isSessionGenerationCurrent(queryClient,generation)"))
  assert.ok(hook.includes("getWebPushConfig({signal:sessionSignal})"))
  assert.ok(hook.includes("upsertWebPushSubscription(subscription.toJSON(),{signal:sessionSignal})"))
  assert.ok(api.includes("signal?:AbortSignal"))
})

test("Web Push device status follows the account switch and does not log subscription data", () => {
  const notifications = compact(
    read("src/features/my/components/notifications-content.tsx"),
  )
  const hook = read("src/features/notification/hooks/use-web-push-subscription.ts")

  assert.ok(
    notifications.includes("constshowPushDeviceStatus=settings.notifyAll&&!isWebPushLoading"),
  )
  assert.ok(notifications.includes("{showPushDeviceStatus&&("))
  assert.doesNotMatch(hook, /console\.warn\([^\n]*,\s*error\)/)
})

test("chat room controls wait for canonical state and never act before room type is known", () => {
  const roomPage = compact(read("src/features/chat/components/chat-room-page-content.tsx"))
  const listPage = compact(read("src/features/chat/components/chat-list-page-content.tsx"))
  const moreHeader = compact(read("src/features/chat/components/chat-room-more-header.tsx"))
  const mutations = compact(read("src/features/chat/hooks/use-chat-mutations.ts"))

  assert.ok(roomPage.includes('constcanPinRoom=room!==undefined&&room.roomType!=="question"'))
  assert.ok(roomPage.includes("constcanConfigureRoomNotification=room!==undefined"))
  assert.ok(roomPage.includes("showPinAction={canPinRoom}"))
  assert.ok(roomPage.includes("showNotificationAction={canConfigureRoomNotification}"))
  assert.ok(roomPage.includes("pinPending={setPinnedMutation.isPending}"))
  assert.ok(roomPage.includes("if(!session.authenticated||!canConfigureRoomNotification||setNotifyMutation.isPending)return"))
  assert.ok(roomPage.includes("if(!session.authenticated||!canPinRoom||setPinnedMutation.isPending)return"))
  assert.ok(moreHeader.includes("pinPending?:boolean"))
  assert.ok(moreHeader.includes("aria-busy={pinPending}"))
  assert.ok(moreHeader.includes("disabled={pinPending}"))
  assert.ok(listPage.includes('constcanPinRoom=chat.category!=="question"'))
  assert.ok(listPage.includes("...(canPinRoom?[{") )
  assert.ok(listPage.includes("disabled:setPinnedMutation.isPending"))
  assert.ok(listPage.includes("disabled:leaveChatRoomMutation.isPending"))
  assert.match(
    mutations,
    /functionuseSetNotify\(\).*?onSuccess:\(_data,\{roomId\}\)=>Promise\.all\(/s,
  )
})

test("답변 채택 완료창은 성공 이벤트에서 작성자 이름을 보존한다", () => {
  // 답변 채택은 사전 확인 없이 즉시 실행되도록 바뀌었다(질문 상세 화면 삭제 시점). 확인창 대신
  // 성공 뒤 완료창이 뜨며, 그 완료창에 채택된 답변의 작성자 이름을 담아 보존해야 한다.
  const screen = compact(read("src/features/question/components/answer-view-screen.tsx"))

  assert.ok(
    screen.includes(
      "onSuccess:()=>setAcceptedAuthor({name:answer.authorName,userId:answer.authorUserId})"
    )
  )
})

test("profile upload failure is visible and does not change the meeting failure contract", () => {
  const profile = read("src/features/my/components/edit-profile-content.tsx")

  assert.match(
    profile,
    /const \[profileImageUploadError, setProfileImageUploadError\] = React\.useState<string \| null>\(null\)/,
  )
  assert.match(
    profile,
    /const handleFileSelected = \(file: File\) => \{\s*setProfileImageUploadError\(null\)/,
  )
  assert.match(
    profile,
    /const handleCropped = async \(blob: Blob\) => \{\s*setProfileImageUploadError\(null\)[\s\S]*?catch \{\s*setProfileImageUploadError\(messages\.profileImage\.uploadFailed\)/,
  )
  assert.match(
    profile,
    /profileImageUploadError && \(\s*<Explanation\s+variant="error"\s+role="alert"\s+text=\{profileImageUploadError\}/,
  )

  const meetup = read("src/features/meetup/components/create-meetup-screen.tsx")
  assert.match(meetup, /catch \{\s*setError\(t\.imageUploadFailed\)\s*return/)
})

test("profile image success enables confirmation without an empty profile patch", () => {
  const profile = read("src/features/my/components/edit-profile-content.tsx")

  assert.match(
    profile,
    /const \[hasProfileImageChange, setHasProfileImageChange\] = React\.useState\(false\)/,
  )
  assert.match(profile, /await upload\(blob\)\s*setHasProfileImageChange\(true\)/)
  assert.match(profile, /await remove\(\)\s*setHasProfileImageChange\(true\)/)
  assert.match(profile, /const hasTextChanges = Object\.keys\(payload\)\.length > 0/)
  assert.match(profile, /const hasChanges = hasTextChanges \|\| hasProfileImageChange/)
  assert.match(profile, /if \(!hasTextChanges\) \{\s*router\.back\(\)\s*return\s*\}/)
  assert.match(profile, /updateMe\.mutate\(payload, \{ onSuccess: \(\) => router\.back\(\) \}\)/)
})
