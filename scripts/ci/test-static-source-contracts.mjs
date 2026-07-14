import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import ts from "typescript"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

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
      path: "src/app/chats/report/page.tsx",
      params: [
        { query: "chatId", variable: "roomId" },
        { query: "messageId", variable: "messageId" },
      ],
      content: "<ReportPageContent",
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
      content: "<QuestionDetailScreen",
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

test("source contains no legacy runtime-ID navigation templates", () => {
  const legacyNavigation =
    /(?:router\.(?:push|replace)\(|href=\{)\s*`\/(?:chats|meetups|questions)\/\$\{/

  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const source = fs.readFileSync(file, "utf8")
    assert.doesNotMatch(source, legacyNavigation, path.relative(repoRoot, file))
  }
})

test("fixed query route literals stay centralized in the route builders", () => {
  const fixedRoutes = /^\/(?:chats\/(?:room|notices|report|schedule)|meetups\/detail|questions\/detail)\//

  for (const file of sourceFiles(path.join(repoRoot, "src"))) {
    const relativePath = path.relative(repoRoot, file)
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
  assert.match(read("src/app/join/page.tsx"), /<AuthGate policy="guest-only">/)
  assert.doesNotMatch(read("src/app/join/social/page.tsx"), /\bAuthGate\b/)

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
    /<SessionLoading\s*\/>/,
    "loading and redirect transitions must not expose gated children",
  )
  assert.deepEqual(
    blockingBranch
      ? flattenOr(blockingBranch.expression)
          .map((expression) => compact(expression.getText(authGateFile)))
          .sort()
      : [],
    ['state.kind==="loading"', "shouldRedirectHome", "shouldRedirectToLogin"].sort(),
    "loading and both redirect transitions must block children with OR semantics",
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
