import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { isMeetingAccessErrorCode } from "./schedule-query-error.ts"

test("isMeetingAccessErrorCode identifies membership and kicked access failures", () => {
  assert.equal(isMeetingAccessErrorCode("NOT_MEETING_MEMBER"), true)
  assert.equal(isMeetingAccessErrorCode("KICKED_MEMBER"), true)
})

test("isMeetingAccessErrorCode leaves malformed links and unrelated failures in their existing states", () => {
  assert.equal(isMeetingAccessErrorCode("MEETING_NOT_FOUND"), false)
  assert.equal(isMeetingAccessErrorCode(undefined), false)
})
