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

test("queries, socket, local state, and input consume the session boundary", () => {
  const queriesSource = fs.readFileSync(
    path.join(repoRoot, "src/features/chat/hooks/use-chat-queries.ts"),
    "utf8",
  )
  const roomSource = fs.readFileSync(
    path.join(repoRoot, "src/features/chat/components/chat-room-page-content.tsx"),
    "utf8",
  )
  const socketSource = fs.readFileSync(
    path.join(repoRoot, "src/features/chat/lib/chat-socket.ts"),
    "utf8",
  )
  const inputSource = fs.readFileSync(
    path.join(repoRoot, "src/features/chat/components/chat-message-input.tsx"),
    "utf8",
  )

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
  assert.match(roomSource, /key=\{session\.scopeKey\}/)
  assert.match(roomSource, /useChatRoomSocket\(session\.activeRoomId/)
  assert.match(roomSource, /disabled=\{!session\.authenticated\}/)
  assert.match(roomSource, /trailingIcon=\{session\.authenticated \? undefined : null\}/)
  assert.match(socketSource, /function useChatRoomSocket\(activeRoomId: number \| null/)
  assert.match(inputSource, /disabled\?: boolean/)
  assert.equal(
    inputSource.match(/^\s+disabled=\{disabled\}$/gm)?.length,
    3,
    "camera, message input, and send button must all be disabled",
  )
})
