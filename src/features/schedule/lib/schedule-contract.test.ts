import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { meetingSchedulePath, scheduleReportPath } from "./schedule-contract.ts"

test("meetingSchedulePath produces the meeting-scoped collection and item endpoints", () => {
  assert.equal(meetingSchedulePath(42), "/api/v1/meetings/42/schedules")
  assert.equal(meetingSchedulePath(42, 9), "/api/v1/meetings/42/schedules/9")
})

test("scheduleReportPath produces the schedule report endpoint instead of the message report endpoint", () => {
  assert.equal(
    scheduleReportPath(42, 9),
    "/api/v1/meetings/42/schedules/9/report"
  )
})

test("schedule contract rejects non-positive identifiers before an invalid request can be sent", () => {
  assert.throws(() => meetingSchedulePath(0), RangeError)
  assert.throws(() => scheduleReportPath(42, 0), RangeError)
})

test("meeting schedule adapter tolerates nullable title and location inputs", () => {
  const types = readFileSync(
    resolve(process.cwd(), "src/features/schedule/api/schedule-types.ts"),
    "utf8",
  )
  const adapter = readFileSync(
    resolve(process.cwd(), "src/features/schedule/lib/schedule-adapter.ts"),
    "utf8",
  )

  assert.match(types, /title:\s*string\s*\|\s*null/)
  assert.match(types, /locationName:\s*string\s*\|\s*null/)
  assert.match(adapter, /title:\s*item\.title\s*\?\?\s*""/)
  assert.match(adapter, /locationLabel:\s*item\.locationName\s*\?\?\s*""/)
})
