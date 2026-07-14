import assert from "node:assert/strict"
import test from "node:test"

async function loadTransport() {
  const modulePath = "../../src/lib/runtime/dev-backend-origin.ts"
  return import(modulePath)
}

test("converts an HTTP origin to an exact WebSocket endpoint", async () => {
  const { toWebSocketUrl } = await loadTransport()

  assert.equal(toWebSocketUrl("http://localhost:8080"), "ws://localhost:8080/ws")
})

test("converts an HTTPS origin to a secure WebSocket endpoint", async () => {
  const { toWebSocketUrl } = await loadTransport()

  assert.equal(toWebSocketUrl("https://ieum.example"), "wss://ieum.example/ws")
})

test("normalizes a trailing slash and replaces any origin path with /ws", async () => {
  const { toWebSocketUrl } = await loadTransport()

  assert.equal(toWebSocketUrl("https://ieum.example/legacy/"), "wss://ieum.example/ws")
})

test("ignores a configured backend origin outside development", async () => {
  const { resolveDevBackendOrigin } = await loadTransport()

  assert.equal(resolveDevBackendOrigin("production", "not a URL"), undefined)
})

test("treats a blank development backend origin as unset", async () => {
  const { resolveDevBackendOrigin } = await loadTransport()

  assert.equal(resolveDevBackendOrigin("development", "   "), undefined)
})

test("normalizes a development backend URL to its HTTP origin", async () => {
  const { resolveDevBackendOrigin } = await loadTransport()

  assert.equal(
    resolveDevBackendOrigin("development", "http://localhost:8080/legacy/"),
    "http://localhost:8080"
  )
})

test("rejects a non-HTTP development backend URL", async () => {
  const { resolveDevBackendOrigin } = await loadTransport()

  assert.throws(() => resolveDevBackendOrigin("development", "file:///tmp/backend"), {
    name: "TypeError",
    message: /must use HTTP or HTTPS/,
  })
})
