import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { parseReportTarget } from "./report-target.ts"

test("parseReportTarget preserves the existing message report link contract", () => {
  const params = new URLSearchParams({ chatId: "11", messageId: "28", target: "연두" })

  assert.deepEqual(parseReportTarget(params), {
    kind: "message",
    chatId: 11,
    messageId: 28,
    targetName: "연두",
  })
})

test("parseReportTarget accepts a schedule target without a global chat report fallback", () => {
  const params = new URLSearchParams({ kind: "schedule", meetingId: "42", scheduleId: "9" })

  assert.deepEqual(parseReportTarget(params), {
    kind: "schedule",
    meetingId: 42,
    scheduleId: 9,
    targetName: undefined,
  })
})

test("parseReportTarget rejects incomplete or unknown target links", () => {
  assert.equal(parseReportTarget(new URLSearchParams({ kind: "schedule", meetingId: "42" })), null)
  assert.equal(parseReportTarget(new URLSearchParams({ kind: "unknown", messageId: "28", chatId: "11" })), null)
})
