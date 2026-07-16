import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node type stripping requires explicit TypeScript extensions at runtime.
import { buildScheduleActions } from "./schedule-actions.ts"

test("buildScheduleActions exposes edit and delete only for an editable schedule", () => {
  assert.deepEqual(
    buildScheduleActions({ canEdit: true, canDelete: true, canReport: false }),
    ["edit", "delete"]
  )
})

test("buildScheduleActions exposes report and delete for a host-managed other schedule", () => {
  assert.deepEqual(
    buildScheduleActions({ canEdit: false, canDelete: true, canReport: true }),
    ["report", "delete"]
  )
})

test("buildScheduleActions exposes report only for a participant viewing another schedule", () => {
  assert.deepEqual(
    buildScheduleActions({ canEdit: false, canDelete: false, canReport: true }),
    ["report"]
  )
})

test("buildScheduleActions suppresses the more menu when the server grants no capability", () => {
  assert.deepEqual(
    buildScheduleActions({ canEdit: false, canDelete: false, canReport: false }),
    []
  )
})

test("buildScheduleActions keeps recurring schedules non-editable when the server capability is false", () => {
  assert.deepEqual(
    buildScheduleActions({ canEdit: false, canDelete: false, canReport: true }),
    ["report"]
  )
})
