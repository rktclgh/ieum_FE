import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import ts from "typescript"

import {
  refreshStore,
  subscribeSessionExpired,
} from "../../src/features/session/lib/session-events.js"
import { installSessionInterceptor } from "../../src/lib/api/session-interceptor.js"

const REFRESH_URL = "/api/v1/auth/refresh"
const REFRESH_FAILURE_TIMEOUT_MS = 2_000

function hasProductionSessionInterceptorWiring(source: string) {
  const sourceFile = ts.createSourceFile(
    "client.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  let importedBinding: string | undefined

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "@/lib/api/session-interceptor"
    ) {
      continue
    }

    const namedBindings = statement.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue

    const interceptorImport = namedBindings.elements.find(
      (element) =>
        (element.propertyName?.text ?? element.name.text) ===
        "installSessionInterceptor",
    )
    importedBinding = interceptorImport?.name.text
  }

  if (!importedBinding) return false

  const apiClientDeclarationIndex = sourceFile.statements.findIndex(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) === true &&
      statement.declarationList.declarations.some(
        (declaration) =>
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "apiClient",
      ),
  )

  if (apiClientDeclarationIndex < 0) return false

  return sourceFile.statements.some((statement, index) => {
    if (
      index <= apiClientDeclarationIndex ||
      !ts.isExpressionStatement(statement) ||
      !ts.isCallExpression(statement.expression)
    ) {
      return false
    }

    const call = statement.expression
    return (
      ts.isIdentifier(call.expression) &&
      call.expression.text === importedBinding &&
      call.arguments.length === 1 &&
      ts.isIdentifier(call.arguments[0]) &&
      call.arguments[0].text === "apiClient"
    )
  })
}

async function withTimeout<T>(promise: Promise<T>, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `${label} did not settle within ${REFRESH_FAILURE_TIMEOUT_MS}ms`,
        ),
      )
    }, REFRESH_FAILURE_TIMEOUT_MS)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function createResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = null,
): AxiosResponse {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    status,
    statusText: String(status),
  }
}

function createStatusError(
  config: InternalAxiosRequestConfig,
  status: number,
) {
  return new AxiosError(
    `request failed with status ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    createResponse(config, status),
  )
}

async function waitUntil(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }

  assert.fail("timed out while waiting for adapter activity")
}

test("concurrent 401 responses share one refresh and retry each request once", async () => {
  const attempts = new Map<string, number>()
  let refreshCalls = 0
  let releaseRefresh!: () => void
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve
  })
  let releaseRetries!: () => void
  const retryGate = new Promise<void>((resolve) => {
    releaseRetries = resolve
  })
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === REFRESH_URL) {
      refreshCalls += 1
      await refreshGate
      return createResponse(config, 200, { refreshed: true })
    }

    const url = config.url ?? "unknown"
    const attempt = (attempts.get(url) ?? 0) + 1
    attempts.set(url, attempt)

    if (attempt === 1) {
      throw createStatusError(config, 401)
    }

    await retryGate
    return createResponse(config, 200, { url })
  }
  const client = axios.create({ adapter })
  installSessionInterceptor(client)

  const refreshStates: string[] = []
  const unsubscribeRefresh = refreshStore.subscribe(() => {
    refreshStates.push(refreshStore.getSnapshot())
  })

  try {
    const firstRequest = client.get("/api/v1/private/one")
    const secondRequest = client.get("/api/v1/private/two")

    await waitUntil(
      () =>
        attempts.get("/api/v1/private/one") === 1 &&
        attempts.get("/api/v1/private/two") === 1 &&
        refreshCalls === 1,
    )
    assert.equal(refreshStore.getSnapshot(), "refreshing")
    releaseRefresh()
    await waitUntil(
      () =>
        attempts.get("/api/v1/private/one") === 2 &&
        attempts.get("/api/v1/private/two") === 2,
    )
    assert.equal(
      refreshStore.getSnapshot(),
      "refreshing",
      "auth must remain refreshing until the original requests settle",
    )
    releaseRetries()

    const responses = await Promise.all([firstRequest, secondRequest])

    assert.deepEqual(
      responses.map((response) => response.status),
      [200, 200],
    )
    assert.equal(refreshCalls, 1)
    assert.equal(attempts.get("/api/v1/private/one"), 2)
    assert.equal(attempts.get("/api/v1/private/two"), 2)
    assert.equal(refreshStore.getSnapshot(), "idle")
    assert.deepEqual(refreshStates, ["refreshing", "idle"])
  } finally {
    releaseRefresh()
    releaseRetries()
    unsubscribeRefresh()
  }
})

test("production apiClient installs the exported session interceptor", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/lib/api/client.ts"),
    "utf8",
  )
  const missingInstallCall = `
    import axios from "axios"
    import { installSessionInterceptor } from "@/lib/api/session-interceptor"

    export const apiClient = axios.create()
  `

  assert.equal(hasProductionSessionInterceptorWiring(missingInstallCall), false)
  assert.equal(hasProductionSessionInterceptorWiring(source), true)
})

async function verifyRefreshFailure(refreshStatus: number) {
  let notifications = 0
  let refreshCalls = 0
  const unsubscribe = subscribeSessionExpired(() => {
    notifications += 1
  })
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === REFRESH_URL) {
      refreshCalls += 1
      throw createStatusError(config, refreshStatus)
    }

    throw createStatusError(config, 401)
  }
  const client = axios.create({ adapter })
  installSessionInterceptor(client)

  try {
    await assert.rejects(
      withTimeout(
        client.get("/api/v1/private"),
        `refresh ${refreshStatus} failure`,
      ),
      (error: unknown) =>
        axios.isAxiosError(error) && error.response?.status === refreshStatus,
    )

    assert.equal(refreshCalls, 1)
    return notifications
  } finally {
    unsubscribe()
  }
}

test("refresh 401 and 403 failures each notify session expiry", async () => {
  assert.equal(await verifyRefreshFailure(401), 1)
  assert.equal(await verifyRefreshFailure(403), 1)
})

test("refresh 5xx failures do not notify session expiry", async () => {
  assert.equal(await verifyRefreshFailure(503), 0)
})
