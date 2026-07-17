import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const componentSource = readFileSync(
  new URL("./chat-system-message.tsx", import.meta.url),
  "utf8"
)

test("persisted system messages are static timeline content", () => {
  assert.doesNotMatch(componentSource, /aria-live/)
  assert.doesNotMatch(componentSource, /role="status"/)
})
