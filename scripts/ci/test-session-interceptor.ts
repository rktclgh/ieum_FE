import assert from "node:assert/strict"
import test from "node:test"

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"

import { subscribeSessionExpired } from "../../src/features/session/lib/session-events.js"
import { installSessionInterceptor } from "../../src/lib/api/session-interceptor.js"

const REFRESH_URL = "/api/v1/auth/refresh"

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

    return createResponse(config, 200, { url })
  }
  const client = axios.create({ adapter })
  installSessionInterceptor(client)

  const firstRequest = client.get("/api/v1/private/one")
  const secondRequest = client.get("/api/v1/private/two")

  await waitUntil(
    () =>
      attempts.get("/api/v1/private/one") === 1 &&
      attempts.get("/api/v1/private/two") === 1 &&
      refreshCalls === 1,
  )
  releaseRefresh()

  const responses = await Promise.all([firstRequest, secondRequest])

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200],
  )
  assert.equal(refreshCalls, 1)
  assert.equal(attempts.get("/api/v1/private/one"), 2)
  assert.equal(attempts.get("/api/v1/private/two"), 2)
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
      client.get("/api/v1/private"),
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
