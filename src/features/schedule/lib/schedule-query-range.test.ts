import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildKstMonthScheduleRange } from "./schedule-query-range.ts"

test("buildKstMonthScheduleRange sends the full selected month as KST offset datetimes", () => {
  assert.deepEqual(buildKstMonthScheduleRange(2026, 7), {
    from: "2026-07-01T00:00:00+09:00",
    to: "2026-07-31T23:59:59.999+09:00",
  })
})

test("buildKstMonthScheduleRange uses the real final day for leap-year February", () => {
  assert.deepEqual(buildKstMonthScheduleRange(2028, 2), {
    from: "2028-02-01T00:00:00+09:00",
    to: "2028-02-29T23:59:59.999+09:00",
  })
})

test("buildKstMonthScheduleRange rejects an invalid calendar month", () => {
  assert.throws(() => buildKstMonthScheduleRange(2026, 13), RangeError)
})
