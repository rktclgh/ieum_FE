import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveDevBackendOrigin,
  toWebSocketUrl,
} from "../../src/lib/runtime/dev-backend-origin"

test("converts an HTTP origin to an exact WebSocket endpoint", () => {
  assert.equal(toWebSocketUrl("http://localhost:8080"), "ws://localhost:8080/ws")
})

test("converts an HTTPS origin to a secure WebSocket endpoint", () => {
  assert.equal(toWebSocketUrl("https://ieum.example"), "wss://ieum.example/ws")
})

test("normalizes a trailing slash and replaces any origin path with /ws", () => {
  assert.equal(toWebSocketUrl("https://ieum.example/legacy/"), "wss://ieum.example/ws")
})

test("ignores a configured backend origin outside development", () => {
  assert.equal(resolveDevBackendOrigin("production", "not a URL"), undefined)
})

test("defaults local development to the Spring server when no override is configured", () => {
  assert.equal(
    resolveDevBackendOrigin("development", undefined),
    "http://localhost:8080"
  )
  assert.equal(
    resolveDevBackendOrigin("development", "   "),
    "http://localhost:8080"
  )
})

test("normalizes a development backend URL to its HTTP origin", () => {
  assert.equal(
    resolveDevBackendOrigin("development", "http://localhost:8080/legacy/"),
    "http://localhost:8080"
  )
})

test("rejects a non-HTTP development backend URL", () => {
  assert.throws(() => resolveDevBackendOrigin("development", "file:///tmp/backend"), {
    name: "TypeError",
    message: /must use HTTP or HTTPS/,
  })
})
