import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import ts from "typescript"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(currentDirectory, "../..")
const contractPath = path.join(repoRoot, "src/features/chat/lib/chat-session.ts")
const contractExists = fs.existsSync(contractPath)

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8")
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

function isNamedCall(call, name) {
  return (
    (ts.isIdentifier(call.expression) && call.expression.text === name) ||
    (ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === name)
  )
}

function compact(text) {
  return text.replace(/\s+/g, "")
}

function loadContract() {
  const source = fs.readFileSync(contractPath, "utf8")
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: contractPath,
    reportDiagnostics: true,
  })
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )
  assert.equal(errors.length, 0, "chat session contract must transpile")

  const contractModule = { exports: {} }
  const evaluateContract = new Function(
    "exports",
    "module",
    "require",
    "__filename",
    "__dirname",
    transpiled.outputText,
  )
  evaluateContract(
    contractModule.exports,
    contractModule,
    () => {
      throw new Error("chat session contract must remain dependency-free at runtime")
    },
    contractPath,
    path.dirname(contractPath),
  )

  return contractModule.exports
}

test("chat session access is defined as a pure contract", () => {
  assert.equal(contractExists, true, "src/features/chat/lib/chat-session.ts is missing")
})

test("unknown and guest users cannot activate a private room", { skip: !contractExists }, () => {
  const { resolveChatSessionAccess } = loadContract()

  assert.deepEqual(resolveChatSessionAccess(undefined, 17), {
    authenticated: false,
    userId: null,
    activeRoomId: null,
    scopeKey: "inactive:room:17",
  })
  assert.deepEqual(resolveChatSessionAccess(null, 17), {
    authenticated: false,
    userId: null,
    activeRoomId: null,
    scopeKey: "inactive:room:17",
  })
})

test("an authenticated user activates only the requested valid room", { skip: !contractExists }, () => {
  const { resolveChatSessionAccess } = loadContract()

  assert.deepEqual(resolveChatSessionAccess({ userId: 7 }, 17), {
    authenticated: true,
    userId: 7,
    activeRoomId: 17,
    scopeKey: "user:7:room:17",
  })
  assert.deepEqual(resolveChatSessionAccess({ userId: 7 }), {
    authenticated: true,
    userId: 7,
    activeRoomId: null,
    scopeKey: "user:7:list",
  })
})

test("invalid identities and room ids never activate private chat", { skip: !contractExists }, () => {
  const { resolveChatSessionAccess } = loadContract()

  assert.equal(resolveChatSessionAccess({ userId: 0 }, 17).authenticated, false)
  assert.equal(resolveChatSessionAccess({ userId: 7 }, 0).activeRoomId, null)
  assert.equal(resolveChatSessionAccess({ userId: 7 }, Number.MAX_SAFE_INTEGER + 1).activeRoomId, null)
})

test("the private state scope changes when the user or authentication state changes", { skip: !contractExists }, () => {
  const { resolveChatSessionAccess } = loadContract()

  const firstUser = resolveChatSessionAccess({ userId: 7 }, 17)
  const secondUser = resolveChatSessionAccess({ userId: 8 }, 17)
  const guest = resolveChatSessionAccess(null, 17)

  assert.notEqual(firstUser.scopeKey, secondUser.scopeKey)
  assert.notEqual(firstUser.scopeKey, guest.scopeKey)
})

test("private chat queries and input consume the authenticated room boundary", () => {
  const queriesSource = read("src/features/chat/hooks/use-chat-queries.ts")
  const inputSource = read("src/features/chat/components/chat-message-input.tsx")

  assert.match(queriesSource, /resolveChatSessionAccess/)
  assert.equal(
    queriesSource.match(/enabled: session\.activeRoomId === roomId/g)?.length,
    2,
    "room and messages queries must share the authenticated room boundary",
  )
  assert.match(
    queriesSource,
    /const room = session\.activeRoomId === roomId \? query\.data : undefined/,
  )
  assert.match(queriesSource, /session\.activeRoomId === roomId && query\.data/)
  assert.match(inputSource, /disabled\?: boolean/)
  assert.equal(
    inputSource.match(/^\s+disabled=\{disabled\}$/gm)?.length,
    3,
    "camera, message input, and send button must all be disabled",
  )
})

test("identity-scoped remount owns every private room state and socket", () => {
  const relativePath = "src/features/chat/components/chat-room-page-content.tsx"
  const sourceFile = parse(relativePath)
  const outer = findFunction(sourceFile, "ChatRoomPageContent")
  const scoped = findFunction(sourceFile, "ChatRoomSessionContent")

  assert.ok(outer?.body, "ChatRoomPageContent session boundary is missing")
  assert.ok(scoped?.body, "ChatRoomSessionContent keyed child is missing")

  const outerText = compact(outer.getText(sourceFile))
  assert.ok(
    outerText.includes("constsession=useChatSessionAccess(roomId)"),
    "the outer boundary must derive identity and room scope",
  )
  assert.ok(
    outerText.includes("<ChatRoomSessionContentkey={session.scopeKey}roomId={roomId}session={session}"),
    "identity or room changes must remount the private child",
  )
  assert.equal(
    visit(outer, (node) => ts.isCallExpression(node) && isNamedCall(node, "useState")).length,
    0,
    "private local state must not escape the keyed child",
  )
  assert.equal(
    visit(outer, (node) => ts.isCallExpression(node) && isNamedCall(node, "useChatRoomSocket")).length,
    0,
    "the private socket must not escape the keyed child",
  )

  const privateStateNames = new Set(
    visit(scoped, ts.isVariableDeclaration)
      .filter(
        (declaration) =>
          ts.isArrayBindingPattern(declaration.name) &&
          declaration.initializer &&
          ts.isCallExpression(declaration.initializer) &&
          isNamedCall(declaration.initializer, "useState"),
      )
      .map((declaration) => declaration.name.elements[0]?.name?.getText(sourceFile)),
  )
  for (const stateName of [
    "liveMessages",
    "notice",
    "moreOpen",
    "cameraMenuOpen",
    "activeMessageId",
    "confirmLeaveOpen",
    "confirmDisbandOpen",
    "socketError",
    "activeDateKey",
    "scrollThumbCenter",
  ]) {
    assert.ok(privateStateNames.has(stateName), `${stateName} must reset with the identity scope`)
  }

  const scopedSocketCalls = visit(
    scoped,
    (node) => ts.isCallExpression(node) && isNamedCall(node, "useChatRoomSocket"),
  )
  assert.equal(scopedSocketCalls.length, 1, "the keyed child must own exactly one room socket")
  assert.equal(
    compact(scopedSocketCalls[0].arguments[0].getText(sourceFile)),
    "session.activeRoomId",
    "the socket must receive only the authenticated active room",
  )

  const scopedText = scoped.getText(sourceFile)
  assert.match(scopedText, /disabled=\{!session\.authenticated\}/)
  assert.match(scopedText, /trailingIcon=\{session\.authenticated \? undefined : null\}/)
})

test("room socket activation has an active-room guard and deterministic cleanup", () => {
  const relativePath = "src/features/chat/lib/chat-socket.ts"
  const sourceFile = parse(relativePath)
  const socketHook = findFunction(sourceFile, "useChatRoomSocket")
  assert.ok(socketHook?.body, "useChatRoomSocket is missing")

  const effects = visit(
    socketHook,
    (node) => ts.isCallExpression(node) && isNamedCall(node, "useEffect"),
  )
  const connectionEffect = effects.find((effect) =>
    effect.arguments[0]?.getText(sourceFile).includes("new Client"),
  )
  assert.ok(connectionEffect, "the room socket connection effect is missing")

  const callback = connectionEffect.arguments[0]
  assert.ok(
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
      ts.isBlock(callback.body),
    "the room socket effect must use a block callback",
  )
  const callbackBody = callback.body
  const guard = callbackBody.statements.find(
    (statement) =>
      ts.isIfStatement(statement) &&
      compact(statement.expression.getText(sourceFile)) === "activeRoomId==null",
  )
  assert.ok(
    guard && compact(guard.thenStatement.getText(sourceFile)).includes("return"),
    "guest or unknown sessions must not activate a socket",
  )

  const cleanupReturn = callbackBody.statements.find(
    (statement) =>
      ts.isReturnStatement(statement) &&
      statement.expression &&
      (ts.isArrowFunction(statement.expression) || ts.isFunctionExpression(statement.expression)),
  )
  assert.ok(cleanupReturn?.expression, "the room socket effect must return cleanup")
  const cleanup = cleanupReturn.expression
  const cleanupText = compact(cleanup.getText(sourceFile))
  assert.ok(
    cleanupText.includes("clientRef.current=null"),
    "cleanup must stop later sends from using the previous client",
  )
  assert.ok(
    cleanupText.includes("client.deactivate()"),
    "cleanup must deactivate the previous STOMP connection",
  )

  const callbackText = compact(callback.getText(sourceFile))
  assert.ok(
    callbackText.indexOf("client.activate()") < callbackText.indexOf("client.deactivate()"),
    "activation must be paired with a later cleanup",
  )
  assert.equal(
    compact(connectionEffect.arguments[1]?.getText(sourceFile) ?? ""),
    "[activeRoomId]",
    "room or identity deactivation must rerun the connection cleanup",
  )
})
